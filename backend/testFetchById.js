const { getProducts, getProductById } = require('./src/services/productService.js');
const ProductService = require('./src/services/productService.js');
const service = new ProductService();

async function test() {
  const products = await service.getProducts({}, { pageNumber: 1, pageSize: 100 });
  console.log(`Fetched ${products.length} products`);
  
  for (const p of products) {
    const detail = await service.getProductById(p.id);
    if (!detail) {
      console.log(`Failed to get product ${p.id} (${p.title}) by ID`);
    }
  }
  console.log('Done testing all products');
}
test().catch(console.error);
