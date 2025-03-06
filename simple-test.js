const Airtable = require('airtable');

// Replace with your actual API key and Base ID
const AIRTABLE_API_KEY = 'pat0k8XuZRzbgfr5D.ff14421558961d2f39b20ec5b91a968fafd8eed7594e9f62bd61179bce21822a';
const AIRTABLE_BASE_ID = 'appFDJeAd9Hy9vIzc';

const base = new Airtable({ apiKey: AIRTABLE_API_KEY }).base(AIRTABLE_BASE_ID);

async function testAirtableConnection() {
  try {
    const records = await base('Orders').select({ maxRecords: 1 }).firstPage();
    console.log('✅ Successfully connected to Airtable!');
    console.log('Sample Record:', records[0].fields);
  } catch (error) {
    console.error('❌ ERROR: Failed to connect to Airtable');
    console.error('Error details:', error.message);
  }
}

testAirtableConnection(); 