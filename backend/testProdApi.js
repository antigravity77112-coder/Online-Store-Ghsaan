const axios = require('axios');

async function testAllProdApi() {
  try {
    let allProducts = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const res = await axios.get(`https://dhura-store.vercel.app/api/products?pageNumber=${page}&pageSize=50`);
      if (res.data && res.data.length > 0) {
        allProducts = allProducts.concat(res.data);
        if (res.data.length < 50) {
          hasMore = false;
        } else {
          page++;
        }
      } else {
        hasMore = false;
      }
    }

    console.log(`Fetched ${allProducts.length} products from production.`);
    
    let failed = 0;
    for (const p of allProducts) {
      try {
        const detailRes = await axios.get(`https://dhura-store.vercel.app/api/products/${p.id}`);
        if (detailRes.status !== 200) {
          console.log(`Product ${p.id} returned status ${detailRes.status}`);
          failed++;
        }
      } catch (e) {
        console.log(`Product ${p.id} failed: ${e.response ? e.response.status : e.message} - ${e.response?.data?.message || ''}`);
        failed++;
      }
    }
    console.log(`Test complete. Failed: ${failed}`);
  } catch(e) {
    console.error('Failed to fetch list:', e.message);
  }
}

testAllProdApi();
