const fs = require('fs');
const h = fs.readFileSync('.firecrawl/magic-crochet-home.html', 'utf8');
const re = /(https:\/\/magic-crochet\.com\/assets\/[^\s"]+\.(png|jpg|webp))/g;
let m;
while ((m = re.exec(h))) {
  console.log(m[1]);
}
