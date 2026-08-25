export class AssessmentError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AssessmentError";
  }
}

export function assessmentErrorResponse(error: unknown) {
  if (error instanceof AssessmentError) {
    return Response.json(
      { error: error.code, message: error.message },
      { status: error.status, headers: { "Cache-Control": "no-store" } },
    );
  }

  console.error("Unexpected assessment error", error);
  return Response.json(
    {
      error: "internal_error",
      message: "The assessment service is temporarily unavailable.",
    },
    { status: 500, headers: { "Cache-Control": "no-store" } },
  );
}
