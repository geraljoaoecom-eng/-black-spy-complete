const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

async function updateStripePrices() {
  try {
    console.log('🔄 Atualizando preços do Stripe para dólares...');
    
    // Deletar preços antigos (opcional)
    console.log('🗑️  Deletando preços antigos...');
    
    // Criar novos preços em dólares
    const prices = [
      {
        unit_amount: 2000, // $20.00
        currency: 'usd',
        recurring: { interval: 'month' },
        nickname: 'Monthly Plan - $20',
        product: 'prod_T96zAIFP1dFNGx', // ID do produto criado anteriormente
      },
      {
        unit_amount: 5000, // $50.00
        currency: 'usd',
        recurring: { interval: 'month' },
        nickname: 'Quarterly Plan - $50',
        product: 'prod_T96zAIFP1dFNGx',
      },
      {
        unit_amount: 15000, // $150.00
        currency: 'usd',
        recurring: { interval: 'year' },
        nickname: 'Annual Plan - $150',
        product: 'prod_T96zAIFP1dFNGx',
      },
    ];

    const createdPrices = [];
    for (const priceData of prices) {
      const price = await stripe.prices.create(priceData);
      createdPrices.push(price);
      console.log(`✅ Preço criado: ${price.nickname} - ${price.id}`);
    }

    console.log('\n🎉 Preços atualizados com sucesso!');
    console.log('\n📋 Novos Price IDs:');
    console.log('Mensal ($20):', createdPrices[0].id);
    console.log('Trimestral ($50):', createdPrices[1].id);
    console.log('Anual ($150):', createdPrices[2].id);

    return createdPrices;
  } catch (error) {
    console.error('❌ Erro ao atualizar preços:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  require('dotenv').config();
  updateStripePrices()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = { updateStripePrices };
