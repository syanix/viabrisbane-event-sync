import { ApiResponse } from './types';

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/test/db') {
        return await testDatabase(env);
      } else if (path === '/test/api') {
        return await testApi();
      } else if (path === '/test/all') {
        const dbResult = await testDatabaseInternal(env);
        const apiResult = await testApiInternal();

        return new Response(
          JSON.stringify({
            database: dbResult,
            api: apiResult,
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      } else {
        return new Response(
          JSON.stringify({
            available_endpoints: ['/test/db', '/test/api', '/test/all'],
          }),
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
    } catch (error) {
      console.error('Test error:', error);
      return new Response(
        JSON.stringify({
          error: 'Test failed',
          message: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  },
};

async function testDatabase(env: Env): Promise<Response> {
  const result = await testDatabaseInternal(env);
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function testDatabaseInternal(env: Env): Promise<Record<string, unknown>> {
  try {
    // Test if the events table exists
    const tableCheck = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='events'"
    ).first<{ name: string }>();

    if (!tableCheck) {
      return {
        success: false,
        message: "The 'events' table does not exist in the database",
      };
    }

    // Get the count of events
    const countResult = await env.DB.prepare('SELECT COUNT(*) as count FROM events').first<{
      count: number;
    }>();

    // Get a sample event if any exist
    let sampleEvent = null;
    if (countResult && countResult.count > 0) {
      sampleEvent = await env.DB.prepare('SELECT * FROM events LIMIT 1').first();
    }

    return {
      success: true,
      message: 'Database connection successful',
      table_exists: true,
      event_count: countResult?.count || 0,
      sample_event: sampleEvent,
    };
  } catch (error) {
    console.error('Database test error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function testApi(): Promise<Response> {
  const result = await testApiInternal();
  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function testApiInternal(): Promise<Record<string, unknown>> {
  try {
    // Test the Brisbane City Council API with a minimal query
    const baseUrl =
      'https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/brisbane-city-council-events/records';
    const params = new URLSearchParams({
      limit: '1',
    });

    const response = await fetch(`${baseUrl}?${params}`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    const data: ApiResponse = await response.json();

    return {
      success: true,
      message: 'API connection successful',
      total_count: data.total_count,
      sample_result: data.results.length > 0 ? data.results[0] : null,
    };
  } catch (error) {
    console.error('API test error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
