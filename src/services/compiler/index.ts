import { CompilerService } from './service'

export type { CompilerService } from './service'
export type { CompilationSuccessResponse, CompilationFailureResponse } from './common'

export const compilerService = new CompilerService()
