/**
 * Instagram JSONデコーダー
 * Instagram エクスポートデータの文字エンコーディング問題を解決
 */

/**
 * Instagram JSONの文字列を正しくデコード
 * InstagramはUTF-8バイト列を\uXXXX形式でエスケープしているため、
 * これを正しくデコードする必要がある
 * @param {string} str - デコード対象の文字列
 * @returns {string} - デコード後の文字列
 */
export function decodeInstagramString(str) {
    if (!str) return str;

    // \uXXXX形式のエスケープシーケンスをバイト配列に変換
    const bytes = [];
    let i = 0;
    while (i < str.length) {
        if (str[i] === '\\' && str[i + 1] === 'u') {
            // \uXXXX形式
            const hex = str.substr(i + 2, 4);
            bytes.push(parseInt(hex, 16));
            i += 6;
        } else {
            // 通常の文字
            bytes.push(str.charCodeAt(i));
            i++;
        }
    }

    // バイト配列をUTF-8としてデコード
    try {
        const uint8Array = new Uint8Array(bytes);
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(uint8Array);
    } catch (e) {
        return str; // デコード失敗時は元の文字列を返す
    }
}

/**
 * オブジェクト内のすべての文字列をデコード
 * @param {any} obj - デコード対象のオブジェクト
 * @returns {any} - デコード後のオブジェクト
 */
export function decodeObject(obj) {
    if (typeof obj === 'string') {
        return decodeInstagramString(obj);
    } else if (Array.isArray(obj)) {
        return obj.map(item => decodeObject(item));
    } else if (obj !== null && typeof obj === 'object') {
        const decoded = {};
        for (const key in obj) {
            decoded[key] = decodeObject(obj[key]);
        }
        return decoded;
    }
    return obj;
}
