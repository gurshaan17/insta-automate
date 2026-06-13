import { NextRequest, NextResponse } from "next/server";

import {
  AutomationValidationError,
  createAutomation,
  deleteAutomation,
  listAutomations,
} from "@/lib/automations";

export async function GET() {
  const automations = await listAutomations();
  return NextResponse.json({ automations });
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      postId?: string;
      keyword?: string;
      message?: string;
    };

    const automation = await createAutomation({
      postId: payload.postId ?? "",
      keyword: payload.keyword ?? "",
      message: payload.message ?? "",
    });

    return NextResponse.json({ automation }, { status: 201 });
  } catch (error) {
    if (error instanceof AutomationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unable to create automation." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get("id") ?? "";
    await deleteAutomation(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AutomationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Unable to delete automation." },
      { status: 500 },
    );
  }
}
