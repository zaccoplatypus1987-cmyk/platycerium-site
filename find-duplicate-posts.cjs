const fs = require('fs');
const path = require('path');

// 全品種のJSONファイルを読み込む
const speciesDir = path.join(__dirname, 'public/data/species');
const files = fs.readdirSync(speciesDir).filter(f => f.endsWith('.json'));

console.log('🔍 重複投稿の検出\n');

// 投稿IDごとに、どの品種に含まれているかを記録
const postToSpecies = new Map();

files.forEach(file => {
  const speciesPath = path.join(speciesDir, file);
  const data = JSON.parse(fs.readFileSync(speciesPath, 'utf-8'));

  const speciesId = data.species.id;
  const speciesName = data.species.displayName || speciesId;

  data.posts.forEach(post => {
    const postId = post.id;

    if (!postToSpecies.has(postId)) {
      postToSpecies.set(postId, []);
    }

    postToSpecies.get(postId).push({
      speciesId,
      speciesName,
      fileName: file
    });
  });
});

// 複数の品種に含まれている投稿を検出
const duplicates = [];
postToSpecies.forEach((species, postId) => {
  if (species.length > 1) {
    duplicates.push({
      postId,
      species: species.map(s => s.speciesName),
      files: species.map(s => s.fileName)
    });
  }
});

console.log(`✅ 検出結果: ${duplicates.length}件の重複投稿\n`);

if (duplicates.length > 0) {
  console.log('重複している投稿:\n');
  duplicates.forEach((dup, index) => {
    console.log(`${index + 1}. 投稿ID: ${dup.postId}`);
    console.log(`   含まれている品種: ${dup.species.join(', ')}`);
    console.log(`   ファイル: ${dup.files.join(', ')}`);
    console.log('');
  });

  // JSONファイルに保存
  fs.writeFileSync(
    path.join(__dirname, 'duplicate-posts-report.json'),
    JSON.stringify(duplicates, null, 2),
    'utf-8'
  );
  console.log('✅ レポートを保存: duplicate-posts-report.json');
} else {
  console.log('✅ 重複投稿は見つかりませんでした');
}
