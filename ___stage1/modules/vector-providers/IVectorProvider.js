// IVectorProvider.js
/**
 * Interface for vector database providers.
 *
 * Methods:
 *   - initialize(config)
 *   - upsertVector(id, vector, metadata)
 *   - queryVectors(queryVector, options)
 *   - deleteVector(id)
 *   - deleteNamespace(namespace)
 *   - getStats()
 *   - flush()
 *   - close()
 *
 * Configuration Options:
 *   - local vs remote deployment
 *   - connection parameters (URLs, API keys, etc.)
 *   - performance tuning (batch sizes, timeouts)
 *   - metadata schema definitions
 */
class IVectorProvider {
    /**
     * @param {Object} config
     */
    async initialize(config) { throw new Error('Not implemented'); }
    /**
     * @param {String} id
     * @param {Array<Number>} vector
     * @param {Object} metadata
     */
    async upsertVector(id, vector, metadata) { throw new Error('Not implemented'); }
    /**
     * @param {Array<Number>} queryVector
     * @param {Object} options
     */
    async queryVectors(queryVector, options) { throw new Error('Not implemented'); }
    /**
     * @param {String} id
     */
    async deleteVector(id) { throw new Error('Not implemented'); }
    /**
     * @param {String} namespace
     */
    async deleteNamespace(namespace) { throw new Error('Not implemented'); }
    /**
     * List all vectors whose ID starts with the given prefix.
     * @param {String} prefix
     * @returns {Promise<Array<{id: String|Number, vector: Number[], metadata: any}>>}
     */
    async listVectors(prefix) { throw new Error('Not implemented'); }
    async getStats() { throw new Error('Not implemented'); }
    async flush() { throw new Error('Not implemented'); }
    async close() { throw new Error('Not implemented'); }
}

export default IVectorProvider; 