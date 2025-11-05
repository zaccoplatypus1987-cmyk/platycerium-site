/**
 * Text Cleaner Utility
 * 絵文字・ハッシュタグ・特殊記号を削除してクリーンなテキストを生成
 */

/**
 * 絵文字と特殊記号を削除（完全版）
 * @param {string} text - クリーニング対象のテキスト
 * @returns {string} - クリーンなテキスト
 */
export function removeEmojisAndSymbols(text) {
    if (!text) return '';

    let cleaned = text;

    // 絵文字の完全削除（すべてのUnicode範囲）
    cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]/gu, ''); // すべての絵文字（U+1F300-1F9FF）
    cleaned = cleaned.replace(/[\u{2600}-\u{27BF}]/gu, '');   // その他記号（U+2600-27BF）
    cleaned = cleaned.replace(/[\u{1F000}-\u{1F02F}]/gu, ''); // 麻雀牌等
    cleaned = cleaned.replace(/[\u{1F0A0}-\u{1F0FF}]/gu, ''); // トランプ
    cleaned = cleaned.replace(/[\u{1FA00}-\u{1FA6F}]/gu, ''); // 拡張絵文字A
    cleaned = cleaned.replace(/[\u{1FA70}-\u{1FAFF}]/gu, ''); // 拡張絵文字B
    cleaned = cleaned.replace(/[\u{2300}-\u{23FF}]/gu, '');   // 技術記号
    cleaned = cleaned.replace(/[\u{2B50}\u{2B55}]/gu, '');    // 星・円
    cleaned = cleaned.replace(/[\u{FE00}-\u{FE0F}]/gu, '');   // バリエーションセレクタ
    cleaned = cleaned.replace(/[\u{E0020}-\u{E007F}]/gu, ''); // タグ

    // 絵文字のZero Width Joiner（結合文字）を削除
    cleaned = cleaned.replace(/\u200D/gu, '');

    // 特殊なUnicode文字（□や豆腐文字）を削除
    cleaned = cleaned.replace(/[\uFFFD\u25A1\u25A0]/g, ''); // □, ■, �

    // 制御文字（見えない文字）
    cleaned = cleaned.replace(/[\u{0000}-\u{001F}]/gu, '');
    cleaned = cleaned.replace(/[\u{007F}-\u{009F}]/gu, '');

    return cleaned;
}

/**
 * ハッシュタグを確実に削除（多段階処理）
 * @param {string} text - テキスト
 * @returns {string} - ハッシュタグなしのテキスト
 */
function removeHashtagsMultipass(text) {
    if (!text) return '';

    let cleaned = text;

    // ステップ1: 行末のハッシュタグブロックを削除
    // 例: "テキスト\n\n#ハッシュタグ1 \n#ハッシュタグ2\n#ハッシュタグ3"
    cleaned = cleaned.replace(/\n\n[#\s]+.*$/s, '');

    // ステップ2: 個別のハッシュタグを削除（複数パターン）
    cleaned = cleaned.replace(/#[\p{L}\p{N}_]+/gu, ''); // Unicode文字対応
    cleaned = cleaned.replace(/#[^\s#\n]+/g, '');       // 空白・改行以外
    cleaned = cleaned.replace(/#\S+/g, '');              // 空白以外
    cleaned = cleaned.replace(/#/g, '');                 // 残った#記号も削除

    // ステップ3: 複数の空白・改行を整理
    cleaned = cleaned.replace(/\n\s*\n\s*\n/g, '\n\n'); // 3つ以上の改行を2つに
    cleaned = cleaned.replace(/\s+/g, ' ');              // 複数の空白を1つに
    cleaned = cleaned.replace(/\n /g, '\n');             // 改行後の空白削除

    // ステップ4: 前後の空白を削除
    cleaned = cleaned.trim();

    return cleaned;
}

/**
 * キャプションをクリーンにする（絵文字 + ハッシュタグ削除）
 * @param {string} caption - キャプションテキスト
 * @returns {string} - クリーンなキャプション
 */
export function cleanCaption(caption) {
    if (!caption) return '';

    let cleaned = caption;

    // ステップ1: ハッシュタグを先に削除
    cleaned = removeHashtagsMultipass(cleaned);

    // ステップ2: 絵文字と特殊記号を削除
    cleaned = removeEmojisAndSymbols(cleaned);

    // ステップ3: 最終クリーンアップ
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    return cleaned;
}

/**
 * ハッシュタグのみを削除（絵文字は残す）
 * @param {string} text - テキスト
 * @returns {string} - ハッシュタグなしのテキスト
 */
export function removeHashtags(text) {
    if (!text) return '';

    // ハッシュタグを削除
    let cleaned = removeHashtagsMultipass(text);

    // 複数の空白を1つに
    return cleaned.replace(/\s+/g, ' ').trim();
}

/**
 * キャプションから栽培管理アクティビティを検出
 * 特記すべきタグ（板替え、苔増し、追肥）のみを抽出
 * @param {string} caption - キャプションテキスト
 * @returns {Array<{emoji: string, label: string, type: string}>} - 検出されたアクティビティの配列
 */
export function extractCareActivities(caption) {
    if (!caption) return [];

    const activities = [];

    // 板替え（リマウント）
    if (/板替え|リマウント|remount|板付け/i.test(caption)) {
        activities.push({
            emoji: '🌱',
            label: '板替え',
            type: 'remount'
        });
    }

    // 苔増し
    if (/苔増し|苔(?!替)|moss/i.test(caption)) {
        activities.push({
            emoji: '🌿',
            label: '苔増し',
            type: 'moss'
        });
    }

    // 追肥
    if (/追肥|肥料|マグァンプ|magamp|fertiliz/i.test(caption)) {
        activities.push({
            emoji: '💊',
            label: '追肥',
            type: 'fertilize'
        });
    }

    return activities;
}

/**
 * 投稿が購入時かどうかを判定（削除済み - 最初の投稿で判定するため不要）
 * @deprecated 使用しないでください。最初の投稿（index === 0）で判定してください。
 * @param {string} caption - キャプションテキスト
 * @param {boolean} isFirstPost - 最初の投稿かどうか
 * @returns {boolean}
 */
export function isPurchasePost(caption, isFirstPost) {
    // 警告: この関数は非推奨です。最初の投稿（index === 0）で購入判定してください。
    console.warn('[DEPRECATED] isPurchasePost() は非推奨です。最初の投稿で購入判定してください。');
    return isFirstPost;
}
