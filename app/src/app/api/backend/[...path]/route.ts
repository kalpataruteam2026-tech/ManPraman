import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path);
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path);
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path);
}

export async function DELETE(req: NextRequest, { params }: { params: { path: string[] } }) {
  return proxyRequest(req, params.path);
}

async function proxyRequest(req: NextRequest, pathSegments: string[]) {
  let subpath = pathSegments.join('/');
  if (subpath.startsWith('api/v1/')) {
    subpath = subpath.slice('api/v1/'.length);
  }
  const search = req.nextUrl.search;
  const targetUrl =
    subpath === 'healthz'
      ? `${BACKEND_URL}/healthz${search}`
      : `${BACKEND_URL}/api/v1/${subpath}${search}`;

  try {
    const headers = new Headers(req.headers);
    headers.delete('host');
    headers.delete('connection');
    headers.delete('content-length');
    headers.delete('transfer-encoding');
    headers.delete('keep-alive');

    const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.arrayBuffer();

    const response = await fetch(targetUrl, {
      method: req.method,
      headers,
      body,
      cache: 'no-store',
    });

    const resHeaders = new Headers(response.headers);
    resHeaders.delete('content-encoding');
    resHeaders.delete('content-length');
    resHeaders.delete('transfer-encoding');

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: resHeaders,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Backend API Proxy Error',
        message: 'Could not connect to Python FastAPI backend at ' + BACKEND_URL,
        detail: error?.message,
      },
      { status: 502 }
    );
  }
}
