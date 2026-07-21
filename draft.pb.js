// ==========================================
// 🔥 БРОНЕБОЙНЫЙ DRAFT ENGINE (ПЕРЕВОДЫ + КАССА + Т-БАНК)
// ==========================================

// ------------------------------------------
// 1. P2P ПЕРЕВОД МЕЖДУ ГОНЩИКАМИ
// ------------------------------------------
routerAdd("POST", "/api/draft/transfer", (c) => {
    function parseJson(raw) {
        let parsed = {};
        try {
            if (typeof raw === 'string') parsed = JSON.parse(raw);
            else if (typeof raw === 'object' && raw !== null) {
                if (raw.length !== undefined && typeof raw[0] === 'number') {
                    let str = ''; for (let i = 0; i < raw.length; i++) str += String.fromCharCode(raw[i]);
                    parsed = JSON.parse(str || '{}');
                } else parsed = JSON.parse(JSON.stringify(raw));
            }
        } catch (e) { parsed = {}; }
        if (Array.isArray(parsed) || parsed === null || typeof parsed !== 'object') return {};
        return parsed;
    }

    const authRecord = c.get("authRecord");
    const data = $apis.requestInfo(c).data;
    const amount = parseInt(data.amount);
    const recipientRiderId = data.recipient_id;
    const comment = data.comment || "Перевод от друга";

    if (amount <= 0 || !recipientRiderId) throw new BadRequestError("Ошибка данных");

    $app.dao().runInTransaction((txDao) => {
        const allTypes = txDao.findRecordsByExpr("draft_currency_types");
        const allowedCodes = [];
        for (let t of allTypes) {
            if (t.getBool("can_transfer") === true || t.get("can_transfer") === "true" || t.get("can_transfer") === 1) {
                allowedCodes.push(t.getString("code"));
            }
        }

        if (allowedCodes.length === 0) throw new BadRequestError("Системная ошибка: нет разрешенных валют.");

        // 🔥 ФИКС ОШИБКИ "Sql: no rows in result set" ДЛЯ ОТПРАВИТЕЛЯ
        let senderWallet;
        try {
            senderWallet = txDao.findFirstRecordByData("draft_wallets", "user_id", authRecord.id);
        } catch(e) {
            // Если кошелька нет - создаем его, чтобы не было ошибки базы
            const col = txDao.findCollectionByNameOrId("draft_wallets");
            senderWallet = new Record(col, { "user_id": authRecord.id, "balances": {} });
        }
        
        let senderBalances = parseJson(senderWallet.get("balances"));

        let availableToTransfer = 0;
        allowedCodes.forEach(code => {
            let val = parseInt(senderBalances[code]);
            if (!isNaN(val)) availableToTransfer += val;
        });

        if (availableToTransfer < amount) {
            let detailsList = [];
            for (let t of allTypes) {
                let code = t.getString("code");
                let name = t.getString("name") || code;
                let val = parseInt(senderBalances[code] || 0);
                if (val > 0) detailsList.push(`${name}: ${val}`);
            }
            let detailsStr = detailsList.length > 0 ? detailsList.join('\n') : 'Баланс пуст';
            throw new BadRequestError(`❌ Недостаточно Ватт для перевода!\n\nЗапрошено: ${amount}\nДоступно: ${availableToTransfer}\n\nДетализация вашего счета:\n${detailsStr}`);
        }

        let remainingToSettle = amount;
        let sortedTypes = [];
        for (let t of allTypes) {
            if (allowedCodes.includes(t.getString("code"))) sortedTypes.push(t);
        }
        sortedTypes.sort((a, b) => a.getInt("priority") - b.getInt("priority"));
        
        sortedTypes.forEach(t => {
            let code = t.getString("code");
            if (remainingToSettle <= 0) return;
            let bucketBalance = parseInt(senderBalances[code] || 0);
            if (bucketBalance > 0) {
                let toTake = Math.min(bucketBalance, remainingToSettle);
                senderBalances[code] = bucketBalance - toTake;
                remainingToSettle -= toTake;
            }
        });

        const recipientRider = txDao.findRecordById("riders", recipientRiderId);
        const recipientUserId = recipientRider.get("user_id");
        
        let recipientWallet;
        try {
            recipientWallet = txDao.findFirstRecordByData("draft_wallets", "user_id", recipientUserId);
        } catch(e) {
            const col = txDao.findCollectionByNameOrId("draft_wallets");
            recipientWallet = new Record(col, { "user_id": recipientUserId, "balances": {} });
        }
        
        let recipientBalances = parseJson(recipientWallet.get("balances"));
        let targetCode = allowedCodes.length > 0 ? allowedCodes[0] : "real";
        recipientBalances[targetCode] = parseInt(recipientBalances[targetCode] || 0) + amount;

        senderWallet.set("balances", senderBalances);
        recipientWallet.set("balances", recipientBalances);
        txDao.saveRecord(senderWallet);
        txDao.saveRecord(recipientWallet);

        const txCollection = txDao.findCollectionByNameOrId("draft_transactions");
        txDao.saveRecord(new Record(txCollection, {
            "sender_id": authRecord.id,
            "receiver_id": recipientUserId,
            "amount": amount,
            "type": "transfer",
            "status": "success",
            "description": comment
        }));
    });

    return c.json(200, { success: true });
}, $apis.requireRecordAuth("users"));

// ------------------------------------------
// 2. 🔥 ОПЛАТА ГОНОК И ПОКУПОК (КАССА)
// ------------------------------------------
routerAdd("POST", "/api/draft/pay", (c) => {
    function parseJson(raw) {
        let parsed = {};
        try {
            if (typeof raw === 'string') parsed = JSON.parse(raw);
            else if (typeof raw === 'object' && raw !== null) {
                if (raw.length !== undefined && typeof raw[0] === 'number') {
                    let str = ''; for (let i = 0; i < raw.length; i++) str += String.fromCharCode(raw[i]);
                    parsed = JSON.parse(str || '{}');
                } else parsed = JSON.parse(JSON.stringify(raw));
            }
        } catch (e) { parsed = {}; }
        if (Array.isArray(parsed) || parsed === null || typeof parsed !== 'object') return {};
        return parsed;
    }

    try {
        const authRecord = c.get("authRecord");
        const data = $apis.requestInfo(c).data;
        const amount = parseInt(data.amount);
        const purpose = data.purpose || "Оплата услуг";

        if (amount <= 0) throw new Error("Некорректная сумма");

        $app.dao().runInTransaction((txDao) => {
            const rawTypes = txDao.findRecordsByExpr("draft_currency_types");
            const allTypes = [];
            for (let t of rawTypes) allTypes.push(t);

            allTypes.sort((a, b) => a.getInt("priority") - b.getInt("priority"));

            // 🔥 ФИКС ОШИБКИ "Sql: no rows in result set" ДЛЯ ОПЛАТЫ
            let senderWallet;
            try {
                senderWallet = txDao.findFirstRecordByData("draft_wallets", "user_id", authRecord.id);
            } catch(e) {
                const col = txDao.findCollectionByNameOrId("draft_wallets");
                senderWallet = new Record(col, { "user_id": authRecord.id, "balances": {} });
            }
            
            let senderBalances = parseJson(senderWallet.get("balances"));

            let totalAvailable = 0;
            allTypes.forEach(t => {
                let code = t.getString("code");
                let val = parseInt(senderBalances[code] || 0);
                if (!isNaN(val)) totalAvailable += val;
            });

            if (totalAvailable < amount) {
                throw new Error(`❌ Недостаточно Ватт для оплаты.\nНужно: ${amount}\nЕсть: ${totalAvailable}`);
            }

            let remainingToSettle = amount;
            allTypes.forEach(t => {
                let code = t.getString("code");
                if (remainingToSettle <= 0) return;
                let bucketBalance = parseInt(senderBalances[code] || 0);
                if (bucketBalance > 0) {
                    let toTake = Math.min(bucketBalance, remainingToSettle);
                    senderBalances[code] = bucketBalance - toTake;
                    remainingToSettle -= toTake;
                }
            });

            senderWallet.set("balances", senderBalances);
            txDao.saveRecord(senderWallet);

            const txCollection = txDao.findCollectionByNameOrId("draft_transactions");
            txDao.saveRecord(new Record(txCollection, {
                "sender_id": authRecord.id,
                "amount": amount,
                "type": "payment",
                "status": "success",
                "description": purpose
            }));
        });

        return c.json(200, { success: true });
    } catch (e) {
        throw new BadRequestError(e.message || "Ошибка обработки транзакции");
    }
}, $apis.requireRecordAuth("users"));

// ------------------------------------------
// 3. 🔥 ВЕБХУК ОТ Т-БАНКА (АВТО-ЗАЧИСЛЕНИЕ ДЕНЕГ)
// ------------------------------------------
routerAdd("POST", "/api/draft/webhook", (c) => {
    // ⚠️ ВСТАВЬ ТУТ ПАРОЛЬ ОТ ТЕРМИНАЛА 1765265340764
    const TERMINAL_PASSWORD = "fcXLIaZB7Ct1e4IP"; 
    
    const data = $apis.requestInfo(c).data;
    if (!data || !data.OrderId) return c.string(400, "Bad Request");

    function sha256(ascii) {
        function rightRotate(value, amount) { return (value>>>amount) | (value<<(32 - amount)); }
        var mathPow = Math.pow; var maxWord = mathPow(2, 32); var lengthProperty = 'length'; var i, j; var result = ''; var words = [];
        var asciiBitLength = ascii[lengthProperty]*8;
        var hash = [1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225];
        var k = [42853323, 718787259, 928959415, 2276634837, 1506456041, 3266489909, 1982264251, 3816151978, 2451368132, 3959828464, 3223062635, 4118744040, 3474328536, 12693240, 400494541, 1030095745, 488177519, 1146747518, 595260171, 1217592477, 726889417, 1313388716, 921764654, 1374529367, 1057404476, 1421051515, 1147743516, 1475727221, 1222409540, 1502447936, 1289139593, 1583344601, 1357285145, 1610486008, 1426466380, 1698263544, 1493630132, 1755106579, 1526367503, 1874279765, 1591873151, 1968875704, 1650393275, 2038753697, 1746261544, 2125575515, 1836101905, 2217604117, 1891157143, 2259160563, 2004245620, 2362483864, 2079011742, 2419515904, 2154328854, 2486774843, 2212952877, 2533036495, 2320129202, 2603831413, 2378893922, 2661570779, 2439162970, 2736168233];
        ascii += '\x80'; while (ascii[lengthProperty]%64 - 56) ascii += '\x00';
        for (i = 0; i < ascii[lengthProperty]; i++) { j = ascii.charCodeAt(i); if (j>>8) return; words[i>>2] |= j << ((3 - i)%4)*8; }
        words[words[lengthProperty]] = ((asciiBitLength/maxWord)|0); words[words[lengthProperty]] = (asciiBitLength)
        for (j = 0; j < words[lengthProperty];) {
            var w = words.slice(j, j += 16); var oldHash = hash; hash = hash.slice(0, 8);
            for (i = 0; i < 64; i++) {
                var w15 = w[i - 15], w2 = w[i - 2]; var a = hash[0], e = hash[4];
                var temp1 = hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ((e&hash[5])^((~e)&hash[6])) + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15>>>3)) + w[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2>>>10)))|0);
                var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a&hash[1])^(a&hash[2])^(hash[1]&hash[2]));
                hash = [(temp1 + temp2)|0].concat(hash); hash[4] = (hash[4] + temp1)|0;
            }
            for (i = 0; i < 8; i++) { hash[i] = (hash[i] + oldHash[i])|0; }
        }
        for (i = 0; i < 8; i++) { for (j = 3; j + 1; j--) { var b = (hash[i]>>(j*8))&255; result += ((b < 16) ? 0 : '') + b.toString(16); } }
        return result;
    }

    const incomingToken = data.Token;
    let signData = Object.assign({}, data);
    signData.Password = TERMINAL_PASSWORD.trim();
    // Удаляем только Token. Остальное отфильтруем динамически.
    delete signData.Token;
    
    let sortedKeys = Object.keys(signData).sort();
    let rawStr = "";
    for (let k of sortedKeys) {
        let val = signData[k];
        
        // 🔥 ИЗМЕНЕНО: Динамически отсекаем ВСЕ объекты, массивы и null (требование Т-Банка)
        if (val === null || typeof val === "object" || val === undefined) {
            continue;
        }
        
        if (typeof val === "boolean") val = val ? "true" : "false"; 
        rawStr += String(val); // 🔥 ИЗМЕНЕНО: Безопасное приведение к строке
    }
    
    // 🔥 ИЗМЕНЕНО: Используем быстрый нативный движок PB, как в твоем TopUp-роуте
    let expectedToken = "";
    try {
        expectedToken = $security.sha256(rawStr);
    } catch(e) {
        expectedToken = sha256(rawStr);
    }

    // ... (верхняя часть вебхука с проверкой Token остается без изменений)
    if (incomingToken !== expectedToken) {
        return c.string(403, "Forbidden: Invalid Token");
    }

    // 🔥 ИЗМЕНЕНО: Ловим и AUTHORIZED (моментальный холд), и CONFIRMED (ночной клиринг)
    if (["AUTHORIZED", "CONFIRMED"].includes(data.Status) && data.Success === true) {
        const orderId = data.OrderId;
        
        // 🔥 ИЗМЕНЕНО: Отсекаем копейки строгим округлением
        const amount = Math.floor(parseInt(data.Amount) / 100);

        function parseJson(raw) {
            let parsed = {};
            try {
                if (typeof raw === 'string') parsed = JSON.parse(raw);
                else if (typeof raw === 'object' && raw !== null) {
                    if (raw.length !== undefined && typeof raw[0] === 'number') {
                        let str = ''; for (let i = 0; i < raw.length; i++) str += String.fromCharCode(raw[i]);
                        parsed = JSON.parse(str || '{}');
                    } else parsed = JSON.parse(JSON.stringify(raw));
                }
            } catch (e) { parsed = {}; }
            if (Array.isArray(parsed) || parsed === null || typeof parsed !== 'object') return {};
            return parsed;
        }

        $app.dao().runInTransaction((txDao) => {
            let tx;
            try {
                // 🔥 ИЗМЕНЕНО: Строгий и быстрый поиск по точному совпадению без $dbx.exp
                tx = txDao.findFirstRecordByData("draft_transactions", "description", `Счет ${orderId} (T-Bank)`);
            } catch (e) {
                // Если транзакция не найдена — прерываем выполнение
                return; 
            }

            // Защита от двойного зачисления (идемпотентность)
            if (tx.getString("status") === "success") return;

            tx.set("status", "success");
            txDao.saveRecord(tx);

            const userId = tx.getString("receiver_id");

            let wallet;
            try {
                wallet = txDao.findFirstRecordByData("draft_wallets", "user_id", userId);
            } catch(e) {
                const col = txDao.findCollectionByNameOrId("draft_wallets");
                wallet = new Record(col, { "user_id": userId, "balances": {} });
            }

            let balances = parseJson(wallet.get("balances"));
            balances["real"] = parseInt(balances["real"] || 0) + amount; 
            
            wallet.set("balances", balances);
            txDao.saveRecord(wallet);
        });
    }

    return c.string(200, "OK");
});


// ------------------------------------------
// 4. 🔥 ГЕНЕРАЦИЯ ПЛАТЕЖА Т-БАНК (СЕРВЕРНАЯ ЧАСТЬ)
// ------------------------------------------
routerAdd("POST", "/api/draft/topup", (c) => {
    // ⚠️ ВАЖНО: Проверь, тестовый пароль или боевой! Они РАЗНЫЕ!
    const TERMINAL_KEY = "1765265340764";
    const TERMINAL_PASSWORD = "fcXLIaZB7Ct1e4IP"; 

    const data = $apis.requestInfo(c).data;
    const amountRub = parseInt(data.amount);
    const email = data.email || "info@sotka.one"; 

    if (!amountRub || amountRub <= 0) return c.json(400, { error: "Неверная сумма" });

    const user = c.get("authRecord");
    if (!user) return c.json(401, { error: "Пользователь не авторизован" });

    const userId = user.id;
    const orderId = `V_${userId}_${Date.now()}`;
    const amountKopecks = amountRub * 100;
    const description = "Topup VATT"; // Оставляем строгую латиницу

    // 1. 🔥 УМНАЯ СБОРКА ПАРАМЕТРОВ (Гарантия правильной сортировки)
    // Собираем базовые параметры, которые уйдут в запрос
    const basePayload = {
        Amount: amountKopecks,
        Description: description,
        OrderId: orderId,
        TerminalKey: TERMINAL_KEY
    };

    // 2. Создаем отдельный объект ТОЛЬКО для подписи (добавляем туда пароль)
    const signData = Object.assign({}, basePayload);
    signData.Password = TERMINAL_PASSWORD.trim();

    // 3. Автоматически сортируем ключи по алфавиту и склеиваем
    const sortedKeys = Object.keys(signData).sort();
    let rawStr = "";
    for (let k of sortedKeys) {
        rawStr += signData[k].toString();
    }

    // Резервная JS-функция на случай, если встроенная недоступна
    function sha256(ascii) {
        function rightRotate(value, amount) { return (value>>>amount) | (value<<(32 - amount)); }
        var mathPow = Math.pow; var maxWord = mathPow(2, 32); var lengthProperty = 'length'; var i, j; var result = ''; var words = [];
        var asciiBitLength = ascii[lengthProperty]*8;
        var hash = [1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225];
        var k = [42853323, 718787259, 928959415, 2276634837, 1506456041, 3266489909, 1982264251, 3816151978, 2451368132, 3959828464, 3223062635, 4118744040, 3474328536, 12693240, 400494541, 1030095745, 488177519, 1146747518, 595260171, 1217592477, 726889417, 1313388716, 921764654, 1374529367, 1057404476, 1421051515, 1147743516, 1475727221, 1222409540, 1502447936, 1289139593, 1583344601, 1357285145, 1610486008, 1426466380, 1698263544, 1493630132, 1755106579, 1526367503, 1874279765, 1591873151, 1968875704, 1650393275, 2038753697, 1746261544, 2125575515, 1836101905, 2217604117, 1891157143, 2259160563, 2004245620, 2362483864, 2079011742, 2419515904, 2154328854, 2486774843, 2212952877, 2533036495, 2320129202, 2603831413, 2378893922, 2661570779, 2439162970, 2736168233];
        ascii += '\x80'; while (ascii[lengthProperty]%64 - 56) ascii += '\x00';
        for (i = 0; i < ascii[lengthProperty]; i++) { j = ascii.charCodeAt(i); if (j>>8) return; words[i>>2] |= j << ((3 - i)%4)*8; }
        words[words[lengthProperty]] = ((asciiBitLength/maxWord)|0); words[words[lengthProperty]] = (asciiBitLength)
        for (j = 0; j < words[lengthProperty];) {
            var w = words.slice(j, j += 16); var oldHash = hash; hash = hash.slice(0, 8);
            for (i = 0; i < 64; i++) {
                var w15 = w[i - 15], w2 = w[i - 2]; var a = hash[0], e = hash[4];
                var temp1 = hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + ((e&hash[5])^((~e)&hash[6])) + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15>>>3)) + w[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2>>>10)))|0);
                var temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + ((a&hash[1])^(a&hash[2])^(hash[1]&hash[2]));
                hash = [(temp1 + temp2)|0].concat(hash); hash[4] = (hash[4] + temp1)|0;
            }
            for (i = 0; i < 8; i++) { hash[i] = (hash[i] + oldHash[i])|0; }
        }
        for (i = 0; i < 8; i++) { for (j = 3; j + 1; j--) { var b = (hash[i]>>(j*8))&255; result += ((b < 16) ? 0 : '') + b.toString(16); } }
        return result;
    }

    let token = "";
    try {
        // 🔥 Пытаемся использовать сверхбыстрый и надежный движок самого PocketBase
        token = $security.sha256(rawStr);
    } catch(e) {
        // Запасной вариант
        token = sha256(rawStr);
    }

    // 4. Формируем итоговый запрос, добавляя Token и Чек
    const payload = Object.assign({}, basePayload);
    payload.Token = token;
    payload.Receipt = {
        Email: email,
        Taxation: "usn_income",
        Items: [{
            Name: "Пополнение баланса (ВАТТ)",
            Price: amountKopecks,
            Quantity: 1,
            Amount: amountKopecks,
            PaymentMethod: "full_payment",
            PaymentObject: "service",
            Tax: "none"
        }]
    };

    // 5. Отправляем запрос в API Т-Банка
    const res = $http.send({
        url: "https://securepay.tinkoff.ru/v2/Init",
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" }
    });

    if (res.statusCode !== 200) return c.json(500, { error: "Ошибка связи с банком" });
    
    const bankData = res.json;
    if (!bankData.Success) return c.json(500, { error: bankData.Message, details: bankData.Details });

    const collection = $app.dao().findCollectionByNameOrId("draft_transactions");
    const record = new Record(collection, {
        sender_id: "",
        receiver_id: userId,
        amount: amountRub,
        type: "topup",
        status: "pending",
        description: `Счет ${orderId} (T-Bank)`
    });
    $app.dao().saveRecord(record);

    return c.json(200, { paymentUrl: bankData.PaymentURL });
}, $apis.requireRecordAuth("users"));

// 🔥 ДОБАВЛЕНО: Event Hook. Создаем пустой кошелек автоматически при регистрации
onRecordAfterCreateRequest((e) => {
    // Берем ID свежесозданного юзера
    const userId = e.record.get("id"); 

    try {
        const col = $app.dao().findCollectionByNameOrId("draft_wallets");
        const newWallet = new Record(col, { 
            "user_id": userId, 
            "balances": {} 
        });
        $app.dao().saveRecord(newWallet);
    } catch (err) {
        $app.logger().error("Ошибка автосоздания кошелька:", err);
    }
}, "users"); // Триггер срабатывает строго после создания записи в коллекции users

// ==========================================
// 🛠 ОДНОРАЗОВЫЙ СКРИПТ: МАССОВОЕ СОЗДАНИЕ КОШЕЛЬКОВ
// ==========================================
routerAdd("GET", "/api/draft/force-init-wallets", (c) => {
    // Небольшая защита, чтобы никто чужой случайно не дернул этот роут
    const secret = c.queryParam("secret");
    if (secret !== "admin123") {
        return c.json(403, { error: "Нет доступа" });
    }

    let createdCount = 0;
    let skippedCount = 0;

    // Запускаем транзакцию: если что-то пойдет не так, база откатится в исходное состояние
    $app.dao().runInTransaction((txDao) => {
        // Достаем всех зарегистрированных пользователей
        const allUsers = txDao.findRecordsByExpr("users");
        const walletCollection = txDao.findCollectionByNameOrId("draft_wallets");

        for (let user of allUsers) {
            const userId = user.get("id"); // Надежно извлекаем ID
            
            try {
                // Пытаемся найти кошелек для этого пользователя
                txDao.findFirstRecordByData("draft_wallets", "user_id", userId);
                skippedCount++; // Если ошибка не вылетела, кошелек уже существует
            } catch (e) {
                // Если база выкинула ошибку (кошелька нет) — создаем пустой!
                const newWallet = new Record(walletCollection, { 
                    "user_id": userId, 
                    "balances": {} 
                });
                txDao.saveRecord(newWallet);
                createdCount++;
            }
        }
    });

    return c.json(200, { 
        message: "✅ База данных успешно синхронизирована!", 
        created_new_wallets: createdCount, 
        already_existed: skippedCount,
        total_users_scanned: createdCount + skippedCount
    });
});