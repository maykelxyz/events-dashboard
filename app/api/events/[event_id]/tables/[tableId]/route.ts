import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ event_id: string; tableId: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { event_id, tableId } = await params;
  const body = await req.json();

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_API_URL}/v1/events/${event_id}/tables/${tableId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Failed to rename table' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ event_id: string; tableId: string }> }
) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { event_id, tableId } = await params;

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_API_URL}/v1/events/${event_id}/tables/${tableId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    }

    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: 'Failed to delete table' }, { status: 500 });
  }
}
