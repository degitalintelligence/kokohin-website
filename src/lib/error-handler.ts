/**
 * Structured Error Handler untuk WhatsApp Integration
 * 
 * Menyediakan utilities untuk error handling yang konsisten
 * dengan logging, monitoring, dan user-friendly messages
 */

export enum ErrorCode {
  // API Errors
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  METHOD_NOT_ALLOWED = 'METHOD_NOT_ALLOWED',
  CONFLICT = 'CONFLICT',
  UNPROCESSABLE_ENTITY = 'UNPROCESSABLE_ENTITY',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  
  // WhatsApp Errors
  WHATSAPP_NOT_CONNECTED = 'WHATSAPP_NOT_CONNECTED',
  WHATSAPP_MESSAGE_FAILED = 'WHATSAPP_MESSAGE_FAILED',
  WHATSAPP_RATE_LIMITED = 'WHATSAPP_RATE_LIMITED',
  WHATSAPP_SESSION_EXPIRED = 'WHATSAPP_SESSION_EXPIRED',
  WHATSAPP_INVALID_PHONE = 'WHATSAPP_INVALID_PHONE',
  
  // Database Errors
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',
  DATABASE_QUERY_ERROR = 'DATABASE_QUERY_ERROR',
  DATABASE_CONSTRAINT_ERROR = 'DATABASE_CONSTRAINT_ERROR',
  
  // Cache Errors
  CACHE_CONNECTION_ERROR = 'CACHE_CONNECTION_ERROR',
  CACHE_OPERATION_ERROR = 'CACHE_OPERATION_ERROR',
  
  // Media Errors
  MEDIA_UPLOAD_ERROR = 'MEDIA_UPLOAD_ERROR',
  MEDIA_DOWNLOAD_ERROR = 'MEDIA_DOWNLOAD_ERROR',
  MEDIA_PROCESSING_ERROR = 'MEDIA_PROCESSING_ERROR',
  MEDIA_TOO_LARGE = 'MEDIA_TOO_LARGE',
  MEDIA_UNSUPPORTED_FORMAT = 'MEDIA_UNSUPPORTED_FORMAT',
  
  // Server Errors
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT = 'GATEWAY_TIMEOUT',
  
  // Business Logic Errors
  BUSINESS_VALIDATION_ERROR = 'BUSINESS_VALIDATION_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS = 'RESOURCE_ALREADY_EXISTS',
  OPERATION_NOT_PERMITTED = 'OPERATION_NOT_PERMITTED',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface ErrorDetails {
  field?: string;
  value?: unknown;
  expected?: string;
  actual?: string;
  context?: Record<string, unknown>;
}

export interface StructuredError {
  code: ErrorCode;
  message: string;
  details: ErrorDetails | null;
  severity: ErrorSeverity;
  timestamp: string;
  requestId?: string;
  userId?: string;
  stack?: string;
}

export interface ErrorResponse {
  success: false;
  error: StructuredError;
}

export interface ErrorContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  chatId?: string;
  messageId?: string;
  operation?: string;
  [key: string]: unknown;
}

export class WhatsAppError extends Error {
  public code: ErrorCode;
  public severity: ErrorSeverity;
  public details: ErrorDetails | null;
  public context: ErrorContext;
  public timestamp: string;

  constructor(
    code: ErrorCode,
    message: string,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    details: ErrorDetails | null = null,
    context: ErrorContext = {},
    originalError?: Error
  ) {
    super(message);
    this.name = 'WhatsAppError';
    this.code = code;
    this.severity = severity;
    this.details = details;
    this.context = context;
    this.timestamp = new Date().toISOString();

    if (originalError) {
      this.stack = originalError.stack;
      this.cause = originalError;
    }
  }

  toStructuredError(): StructuredError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      severity: this.severity,
      timestamp: this.timestamp,
      requestId: this.context.requestId,
      userId: this.context.userId,
      stack: this.stack,
    };
  }

  toResponse(): ErrorResponse {
    return {
      success: false,
      error: this.toStructuredError(),
    };
  }
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorLog: StructuredError[] = [];
  private maxLogSize = 1000;

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle error dengan logging dan monitoring
   */
  handleError(
    error: unknown,
    context: ErrorContext = {},
    severity?: ErrorSeverity
  ): StructuredError {
    const structuredError = this.createStructuredError(error, context, severity);
    
    // Log error
    this.logError(structuredError);
    
    // Monitor critical errors
    if (structuredError.severity === ErrorSeverity.CRITICAL) {
      this.monitorCriticalError(structuredError);
    }
    
    return structuredError;
  }

  /**
   * Create structured error dari berbagai tipe error
   */
  createStructuredError(
    error: unknown,
    context: ErrorContext = {},
    severity?: ErrorSeverity
  ): StructuredError {
    if (error instanceof WhatsAppError) {
      return {
        ...error.toStructuredError(),
        requestId: context.requestId || error.context.requestId,
        userId: context.userId || error.context.userId,
      };
    }

    if (error instanceof Error) {
      const errorInfo = this.categorizeError(error);
      return {
        code: errorInfo.code,
        message: errorInfo.message,
        details: this.extractErrorDetails(error),
        severity: severity || errorInfo.severity,
        timestamp: new Date().toISOString(),
        requestId: context.requestId,
        userId: context.userId,
        stack: error.stack,
      };
    }

    // Handle non-Error objects
    return {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: 'An unexpected error occurred',
      details: { context: { error } },
      severity: severity || ErrorSeverity.HIGH,
      timestamp: new Date().toISOString(),
      requestId: context.requestId,
      userId: context.userId,
    };
  }

  /**
   * Kategorikan error untuk menentukan code dan severity
   */
  private categorizeError(error: Error): { code: ErrorCode; message: string; severity: ErrorSeverity } {
    const errorMessage = error.message.toLowerCase();

    // WhatsApp specific errors
    if (errorMessage.includes('whatsapp') || errorMessage.includes('waha')) {
      if (errorMessage.includes('not connected') || errorMessage.includes('disconnected')) {
        return {
          code: ErrorCode.WHATSAPP_NOT_CONNECTED,
          message: 'WhatsApp service is not connected',
          severity: ErrorSeverity.HIGH,
        };
      }
      if (errorMessage.includes('rate limit') || errorMessage.includes('too many')) {
        return {
          code: ErrorCode.WHATSAPP_RATE_LIMITED,
          message: 'WhatsApp rate limit exceeded',
          severity: ErrorSeverity.MEDIUM,
        };
      }
      if (errorMessage.includes('session') || errorMessage.includes('expired')) {
        return {
          code: ErrorCode.WHATSAPP_SESSION_EXPIRED,
          message: 'WhatsApp session has expired',
          severity: ErrorSeverity.HIGH,
        };
      }
      if (errorMessage.includes('invalid phone') || errorMessage.includes('invalid number')) {
        return {
          code: ErrorCode.WHATSAPP_INVALID_PHONE,
          message: 'Invalid phone number format',
          severity: ErrorSeverity.LOW,
        };
      }
    }

    // Database errors
    if (errorMessage.includes('database') || errorMessage.includes('connection')) {
      return {
        code: ErrorCode.DATABASE_CONNECTION_ERROR,
        message: 'Database connection error',
        severity: ErrorSeverity.CRITICAL,
      };
    }

    if (errorMessage.includes('constraint') || errorMessage.includes('duplicate')) {
      return {
        code: ErrorCode.DATABASE_CONSTRAINT_ERROR,
        message: 'Database constraint violation',
        severity: ErrorSeverity.MEDIUM,
      };
    }

    // Media errors
    if (errorMessage.includes('media') || errorMessage.includes('file')) {
      if (errorMessage.includes('too large') || errorMessage.includes('size')) {
        return {
          code: ErrorCode.MEDIA_TOO_LARGE,
          message: 'Media file is too large',
          severity: ErrorSeverity.LOW,
        };
      }
      if (errorMessage.includes('unsupported') || errorMessage.includes('format')) {
        return {
          code: ErrorCode.MEDIA_UNSUPPORTED_FORMAT,
          message: 'Unsupported media format',
          severity: ErrorSeverity.LOW,
        };
      }
      if (errorMessage.includes('upload')) {
        return {
          code: ErrorCode.MEDIA_UPLOAD_ERROR,
          message: 'Media upload failed',
          severity: ErrorSeverity.MEDIUM,
        };
      }
      if (errorMessage.includes('download')) {
        return {
          code: ErrorCode.MEDIA_DOWNLOAD_ERROR,
          message: 'Media download failed',
          severity: ErrorSeverity.MEDIUM,
        };
      }
    }

    // Default to internal server error
    return {
      code: ErrorCode.INTERNAL_SERVER_ERROR,
      message: error.message || 'Internal server error',
      severity: ErrorSeverity.HIGH,
    };
  }

  /**
   * Extract error details dari error message
   */
  private extractErrorDetails(error: Error): ErrorDetails | null {
    const message = error.message;
    
    // Try to extract field validation errors
    const fieldMatch = message.match(/field\s+['"]?([^'"\s]+)['"]?\s+(.+)/i);
    if (fieldMatch) {
      return {
        field: fieldMatch[1],
        value: fieldMatch[2],
        context: { originalMessage: message },
      };
    }

    // Try to extract expected vs actual values
    const valueMatch = message.match(/expected\s+(.+)\s+but\s+got\s+(.+)/i);
    if (valueMatch) {
      return {
        expected: valueMatch[1],
        actual: valueMatch[2],
        context: { originalMessage: message },
      };
    }

    return {
      context: { originalMessage: message },
    };
  }

  /**
   * Log error untuk monitoring dan debugging
   */
  public logError(error: StructuredError): void;
  public logError(error: unknown, context?: ErrorContext): void;
  public logError(error: unknown, context?: ErrorContext): void {
    let structuredError: StructuredError;
    
    if (this.isStructuredError(error)) {
      structuredError = error;
    } else {
      structuredError = this.createStructuredError(error, context);
    }
    
    // Add to in-memory log
    this.errorLog.push(structuredError);
    
    // Keep log size manageable
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog = this.errorLog.slice(-this.maxLogSize);
    }

    // Log to console with appropriate level
    const logMessage = `[${structuredError.code}] ${structuredError.message}`;
    
    switch (structuredError.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('🚨 CRITICAL:', logMessage, structuredError.details);
        break;
      case ErrorSeverity.HIGH:
        console.error('❌ ERROR:', logMessage, structuredError.details);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('⚠️  WARNING:', logMessage, structuredError.details);
        break;
      case ErrorSeverity.LOW:
        console.info('ℹ️  INFO:', logMessage, structuredError.details);
        break;
    }
  }

  /**
   * Type guard untuk StructuredError
   */
  private isStructuredError(error: unknown): error is StructuredError {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      'message' in error &&
      'severity' in error &&
      'timestamp' in error
    );
  }

  /**
   * Monitor critical errors untuk alerting
   */
  private monitorCriticalError(error: StructuredError): void {
    // In a real implementation, this would send to monitoring service
    // For now, we'll just log with extra emphasis
    console.error('🔔 CRITICAL ERROR ALERT:', {
      code: error.code,
      message: error.message,
      timestamp: error.timestamp,
      requestId: error.requestId,
      userId: error.userId,
    });
  }

  /**
   * Get recent errors untuk debugging
   */
  getRecentErrors(limit = 50): StructuredError[] {
    return this.errorLog.slice(-limit);
  }

  /**
   * Get error statistics
   */
  getErrorStats(): Record<ErrorSeverity, number> {
    const stats: Record<ErrorSeverity, number> = {
      [ErrorSeverity.LOW]: 0,
      [ErrorSeverity.MEDIUM]: 0,
      [ErrorSeverity.HIGH]: 0,
      [ErrorSeverity.ERROR]: 0,
      [ErrorSeverity.CRITICAL]: 0,
    };

    this.errorLog.forEach(error => {
      stats[error.severity]++;
    });

    return stats;
  }

  /**
   * Clear error log
   */
  clearErrorLog(): void {
    this.errorLog = [];
  }
}

/**
 * Helper functions untuk common error scenarios
 */

export function createValidationError(
  field: string,
  message: string,
  value?: unknown,
  context?: ErrorContext
): WhatsAppError {
  return new WhatsAppError(
    ErrorCode.BAD_REQUEST,
    message,
    ErrorSeverity.LOW,
    { field, value, context },
    context
  );
}

export function createNotFoundError(
  resource: string,
  identifier?: string,
  context?: ErrorContext
): WhatsAppError {
  const message = identifier 
    ? `${resource} not found: ${identifier}`
    : `${resource} not found`;
    
  return new WhatsAppError(
    ErrorCode.NOT_FOUND,
    message,
    ErrorSeverity.LOW,
    { value: identifier },
    context
  );
}

export function createBusinessError(
  message: string,
  details?: ErrorDetails,
  context?: ErrorContext
): WhatsAppError {
  return new WhatsAppError(
    ErrorCode.BUSINESS_VALIDATION_ERROR,
    message,
    ErrorSeverity.MEDIUM,
    details,
    context
  );
}

export function createDatabaseError(
  operation: string,
  originalError: Error,
  context?: ErrorContext
): WhatsAppError {
  return new WhatsAppError(
    ErrorCode.DATABASE_QUERY_ERROR,
    `Database error during ${operation}`,
    ErrorSeverity.HIGH,
    { context: { operation, originalError: originalError.message } },
    context,
    originalError
  );
}

export function createWhatsAppError(
  message: string,
  code: ErrorCode = ErrorCode.WHATSAPP_MESSAGE_FAILED,
  severity: ErrorSeverity = ErrorSeverity.HIGH,
  details?: ErrorDetails,
  context?: ErrorContext
): WhatsAppError {
  return new WhatsAppError(code, message, severity, details, context);
}

/**
 * Global error handler untuk uncaught exceptions
 */
export function initializeGlobalErrorHandler(): void {
  const errorHandler = ErrorHandler.getInstance();

  process.on('uncaughtException', (error) => {
    console.error('🚨 UNCAUGHT EXCEPTION:', error);
    errorHandler.handleError(error, {}, ErrorSeverity.CRITICAL);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('🚨 UNHANDLED REJECTION at:', promise, 'reason:', reason);
    errorHandler.handleError(reason as Error, {}, ErrorSeverity.CRITICAL);
  });
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();