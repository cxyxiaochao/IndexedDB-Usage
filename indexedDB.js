export function openDB(dbName, version = 1) {
    return new Promise((resolve, reject) => {
        // 兼容浏览器
        const indexedDB =
            window.indexedDB ||
            window.mozIndexedDB ||
            window.webkitIndexedDB ||
            window.msIndexedDB;
        let db;
        // 打开数据库, 如果数据库不存在则创建
        const request = indexedDB.open(dbName, version);
        // 数据库打开成功回调
        request.onsuccess = function (event) {
            db = event.target.result;
            console.log('数据库打开成功');
            resolve(db);
        };
        // 数据库打开失败回调
        request.onerror = function (event) {
            console.log('数据库打开失败');
            reject(event);
        };
        // 数据库有更新时候的回调
        request.onupgradeneeded = function (event) {
            // 数据库创建或升级的时候触发
            console.log('数据库版本号发生变化');
            db = event.target.result; // 数据库对象
            // 创建对象仓库
            let objectStore;
            // 创建存储库
            objectStore = db.createObjectStore('users', {
                keyPath: 'id',  // 主键
                // autoIncrement: true  // 实现自增长
            });
            // 创建索引，在后面查询数据的时候可以根据索引查
            objectStore.createIndex('uuid', 'uuid', { unique: true }); // 不可重复
            objectStore.createIndex('name', 'name', { unique: false });
            objectStore.createIndex('age', 'age', { unique: false });
        };
    })
}

// 插入数据
export function addData(db, storeName, data) {
    let request = db
        .transaction([storeName], "readwrite") //事务对象，指定表格名称和操作模式（“只读”或“只写”）
        .objectStore(storeName) // 仓库对象
        .add(data);
    request.onsuccess = function (event) {
        console.log("数据插入成功", event);
    }
    request.onerror = function (event) {
        console.log("数据插入成功", event);
    }
}

// 通过主键查询数据
export function getDataByKey(db, storeName, key) {
    return new Promise((resolve, reject) => {
        if (!db || !storeName || !key) {
            return reject(new Error("Invalid parameters"));
        }

        let transaction = db.transaction([storeName], "readonly"); // 明确指定事务模式
        let objectStore = transaction.objectStore(storeName); // 仓库对象

        let request = objectStore.get(key); // 根据主键查询数据

        request.onerror = function (event) {
            console.error("查询失败", event.target.errorCode);
            reject(new Error("Failed to get data: " + event.target.errorCode)); // 提供详细的错误信息
        }

        request.onsuccess = function (event) {
            console.log("查询成功", event, request.result);
            if (request.result) {
                resolve(request.result); // 查询成功回调
            } else {
                resolve(null); // 如果查询结果为空，返回null
            }
        }
    })
}

// 通过游标查询数据 (查询整张表，另一个方法是使用getAll())
export function cursorGetData(db, storeName) {
    let list = [];
    let store = db.transaction(storeName, "readonly").objectStore(storeName); // 仓库的事务和仓库对象
    let request = store.openCursor(); // 指针对象
    // 游标开启成功，逐行读数据
    request.onsuccess = function (event) {
        let cursor = event.target.result;
        if (cursor) {
            // 必须要检查
            list.push(cursor.value);
            cursor.continue(); // 遍历了存储对象中的所有内容
        } else {
            console.log("游标读取的数据", list);
        }
    }
}

// 通过索引查询数据
export function getDataByIndex(db, storeName, indexName, indexValue) {
    let store = db.transaction(storeName, "readwrite").objectStore(storeName);  // 仓库的事务和仓库对象
    let request = store.index(indexName).get(indexValue);  // 根据索引查询数据
    request.onerror = function (event) {
        console.error("索引查询失败", event.target.errorCode);
    }
    request.onsuccess = function (event) {
        let result = event.target.result;
        console.log("索引查询结果", result);

    }
}

// 通过索引和游标查询数据
export function cursorGetDataByIndex(db, storeName, indexName, indexValue) {
    let list = [];
    let store = db.transaction(storeName, "readonly").objectStore(storeName); // 仓库的事务和仓库对象
    let request = store
        .index(indexName)
        .openCursor(IDBKeyRange.only(indexValue)); // 根据索引查询数据，并返回游标对象
    request.onsuccess = function (event) {
        let cursor = event.target.result;
        if (cursor) {
            list.push(cursor.value);
            cursor.continue(); // 遍历了存储对象中的所有内容
        } else {
            console.log("游标索引查询结果", list);
        }
    }
}

// 通过索引和游标分页查询
export function cursorGetPageByIndexAndPage(db, storeName, indexName, indexValue, page, pageSize) {
    let list = [];
    let counter = 0; // 计数器
    let advanced = true; // 是否跳过多少条查询
    let store = db.transaction(storeName, "readwrite").objectStore(storeName); // 仓库的事务和仓库对象
    let request = store
        .index(indexName)  // 索引对象
        .openCursor(IDBKeyRange.only(indexValue)); // 指针对象
    request.onsuccess = function (event) {
        let cursor = event.target.result;
        if (page > 1 && advanced) {
            advanced = false; // 已经到达下一页，不再继续查询
            cursor.advanced((page - 1) * pageSize); // 跳过多少条
            return;
        }
        if (cursor) {
            // 必须要检查
            list.push(cursor.value);
            counter++;
            if (counter < pageSize) {
                cursor.continue(); // 遍历了存储对象中的所有内容
            } else {
                cursor = null; // 结束查询
                console.log("分页查询结果", list);
            }
        } else {
            console.log("分页查询结果", list);
        }
    }
    request.onerror = function (event) {
        console.error("分页查询失败", event.target.errorCode);
    }
}

// 更新数据
export function upDateDB(db, storeName, data) {
    let request = db.transaction([storeName], "readwrite") //事务对象，指定表格名称和操作模式（“只读”或“只写”）
        .objectStore(storeName) // 仓库对象
        .put(data);
    request.onsuccess = function (event) {
        console.log("数据更新成功", event);
    }
    request.onerror = function (event) {
        console.log("数据更新失败", event);
    }
}

// 通过主键删除数据
export function deleteData(db, storeName, id) {
    let request = db.transaction([storeName], "readwrite") //事务对象，指定表格名称和操作模式（“只读”或“只写”）
        .objectStore(storeName) // 仓库对象
        .delete(id);
    request.onsuccess = function (event) {
        console.log("数据删除成功", event);
    }
    request.onerror = function (event) {
        console.log("数据删除失败", event);
    }
}

// 通过索引和游标删除数据
export function cursorDeleteDataByIndex(db, storeName, indexName, indexValue) {
    let store = db.transaction(storeName, "readwrite").objectStore(storeName); // 仓库的事务和仓库对象
    let request = store
        .index(indexName)
        .openCursor(IDBKeyRange.only(indexValue)); // 根据索引查询数据，并返回游标对象
    request.onsuccess = function (event) {
        let cursor = event.target.result;
        let deleteRequest;
        if (cursor) {
            deleteRequest = cursor.delete(); // 删除当前记录
            deleteRequest.onsuccess = function () {
                console.log("数据删除成功");
            }
            deleteRequest.onerror = function () {
                console.log("数据删除失败");
            }
            cursor.continue(); // 遍历了存储对象中的所有内容
        }
    }
    request.onerror = function (event) {
        console.error("数据删除失败", event.target.errorCode);
    }
}

// 删除数据库
export function deleteDBAll(dbName) {
    let deleteRequest = window.indexedDB.deleteDatabase(dbName);
    deleteRequest.onsuccess = function (event) {
        console.log("数据库删除成功", event);
    }
    deleteRequest.onerror = function (event) {
        console.log("数据库删除失败", event);
    }
}

// 关闭数据库
export function closeDB(db) {
    if (db) {
        db.close();
    }
}
