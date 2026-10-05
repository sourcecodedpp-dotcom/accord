import { NextResponse } from "next/server";
import { ZodError } from "zod";

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export function apiSuccess<T>(data: T, status = 200, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      message,
      data,
    },
    { status }
  );
}

export function apiError(
  message: string,
  status = 400,
  code = "BAD_REQUEST",
  details?: any
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
    },
    { status }
  );
}

export function handleApiError(error: any): NextResponse<ApiResponse> {
  if (error instanceof ZodError) {
    const issues = (error as any).issues || (error as any).errors || [];
    const formattedErrors = issues.map((e: any) => ({
      field: Array.isArray(e.path) ? e.path.join(".") : String(e.path || ""),
      message: e.message,
    }));
    return apiError("Validation error", 422, "VALIDATION_FAILED", formattedErrors);
  }

  const message = error instanceof Error ? error.message : "Internal Server Error";
  const status = error?.status || 500;
  const code = error?.code || "INTERNAL_ERROR";

  return apiError(message, status, code);
}
