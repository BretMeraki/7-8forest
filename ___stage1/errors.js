/**
 * Error classes for Forest MCP Stage1 Architecture
 */

export class ForestError extends Error {
  constructor(message, code, metadata = {}) {
    super(message);
    this.name = 'ForestError';
    this.code = code;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();
  }
}

export class ProjectConfigurationError extends ForestError {
  constructor(projectId, configFile, originalError, metadata = {}) {
    const message = `Project configuration error for ${projectId}: Failed to load ${configFile}`;
    super(message, 'PROJECT_CONFIG_ERROR', {
      projectId,
      configFile,
      originalError: originalError?.message,
      ...metadata
    });
    this.name = 'ProjectConfigurationError';
    this.projectId = projectId;
    this.configFile = configFile;
  }
}

export class HTADataError extends ForestError {
  constructor(operation, projectId, originalError, metadata = {}) {
    const message = `HTA data error during ${operation} for project ${projectId}`;
    super(message, 'HTA_DATA_ERROR', {
      operation,
      projectId,
      originalError: originalError?.message,
      ...metadata
    });
    this.name = 'HTADataError';
    this.operation = operation;
    this.projectId = projectId;
  }
}

export class VectorStoreError extends ForestError {
  constructor(operation, provider, originalError, metadata = {}) {
    const message = `Vector store error during ${operation} with provider ${provider}`;
    super(message, 'VECTOR_STORE_ERROR', {
      operation,
      provider,
      originalError: originalError?.message,
      ...metadata
    });
    this.name = 'VectorStoreError';
    this.operation = operation;
    this.provider = provider;
  }
}

export class TaskSelectionError extends ForestError {
  constructor(reason, context, metadata = {}) {
    const message = `Task selection failed: ${reason}`;
    super(message, 'TASK_SELECTION_ERROR', {
      reason,
      context,
      ...metadata
    });
    this.name = 'TaskSelectionError';
    this.reason = reason;
    this.context = context;
  }
}

export class DataPersistenceError extends ForestError {
  constructor(operation, path, originalError, metadata = {}) {
    const message = `Data persistence error during ${operation} at ${path}`;
    super(message, 'DATA_PERSISTENCE_ERROR', {
      operation,
      path,
      originalError: originalError?.message,
      ...metadata
    });
    this.name = 'DataPersistenceError';
    this.operation = operation;
    this.path = path;
  }
}

export class MCPError extends ForestError {
  constructor(operation, tool, originalError, metadata = {}) {
    const message = `MCP error during ${operation} with tool ${tool}`;
    super(message, 'MCP_ERROR', {
      operation,
      tool,
      originalError: originalError?.message,
      ...metadata
    });
    this.name = 'MCPError';
    this.operation = operation;
    this.tool = tool;
  }
}

// Export all errors for convenience
export const ErrorTypes = {
  ForestError,
  ProjectConfigurationError,
  HTADataError,
  VectorStoreError,
  TaskSelectionError,
  DataPersistenceError,
  MCPError
};

export default ErrorTypes;
