import * as chromadb from 'chromadb';

console.log('ChromaDB exports:', Object.keys(chromadb));
console.log('ChromaClient:', typeof chromadb.ChromaClient);
console.log('Default export:', typeof chromadb.default);

// Try to create a client
try {
  const client = new chromadb.ChromaClient();
  console.log('Client created successfully');
} catch (error) {
  console.log('Client creation error:', error.message);
}