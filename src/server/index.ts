import { ApiResponse, EventRecord } from './types';

// Add slug generation functions
/**
 * Normalizes a string for use in a URL
 * Replaces spaces with hyphens, removes special characters
 */
function normalizeForUrl(str: string): string {
  const normalized = (str || '')
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with a single hyphen
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens

  return normalized || 'unknown'; // Default value if empty
}

/**
 * Creates a URL-friendly slug from a subject and location
 */
function createSlug(subject: string | null, location: string | null): string {
  // Normalize inputs
  const normalizedSubject = (subject || '').trim().toLowerCase();
  const normalizedLocation = (location || '').trim().toLowerCase();

  // Create slug components
  const subjectSlug = normalizeForUrl(normalizedSubject);
  const locationSlug = normalizeForUrl(normalizedLocation);

  // Combine components and ensure result is lowercase
  return `${subjectSlug}-${locationSlug}`.toLowerCase();
}

export interface Env {
  DB: D1Database;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(syncEvents(env));
  },

  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    try {
      const result = await syncEvents(env);
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error syncing events:', error);
      return new Response(JSON.stringify({ error: 'Failed to sync events' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};

async function syncEvents(env: Env): Promise<{ success: boolean; message: string; count: number }> {
  try {
    // Get the latest event from the database
    const latestEventQuery = await env.DB.prepare(
      'SELECT start_datetime FROM events ORDER BY event_id DESC LIMIT 1'
    ).first<{ start_datetime: string }>();

    // Set the baseline date for the API query
    let baselineDate: string;
    if (latestEventQuery && latestEventQuery.start_datetime) {
      // Extract the date part and set time to 00:00:00+00:00
      const dateOnly = latestEventQuery.start_datetime.split('T')[0];
      baselineDate = `${dateOnly}T00:00:00+00:00`;
    } else {
      // If no events in DB, use current date
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      baselineDate = `${year}-${month}-${day}T00:00:00+00:00`;
    }

    // Fetch and save all events
    const savedCount = await fetchAndSaveAllEvents(env, baselineDate);

    return {
      success: true,
      message: `Successfully synced ${savedCount} events`,
      count: savedCount,
    };
  } catch (error) {
    console.error('Error in syncEvents:', error);
    throw error;
  }
}

async function fetchAndSaveAllEvents(env: Env, startDateTime: string): Promise<number> {
  const baseUrl =
    'https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/brisbane-city-council-events/records';
  const limit = 100;
  let offset = 0;
  let totalCount = 0;
  let processedCount = 0;
  let savedCount = 0;

  do {
    // Encode the date parameter properly
    const encodedDate = encodeURIComponent(startDateTime);
    const url = `${baseUrl}?where=start_datetime%20%3E%3D%20%27${encodedDate}%27&order_by=start_datetime&limit=${limit}&offset=${offset}`;

    console.log(`Fetching events from ${url}`);
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    const data: ApiResponse = await response.json();
    totalCount = data.total_count;

    if (data.results.length > 0) {
      const saved = await saveEventsToDatabase(env, data.results);
      savedCount += saved;
    }

    processedCount += data.results.length;
    offset += limit;
  } while (processedCount < totalCount);

  return savedCount;
}

async function saveEventsToDatabase(env: Env, events: EventRecord[]): Promise<number> {
  let savedCount = 0;

  // Process events in batches to avoid overwhelming the database
  const batchSize = 20;
  for (let i = 0; i < events.length; i += batchSize) {
    const batch = events.slice(i, i + batchSize);
    const statements = batch.map((event) => {
      // Check if the event already exists in the database using subject, location, and start_datetime
      const checkStmt = env.DB.prepare(
        'SELECT COUNT(*) as count FROM events WHERE subject = ? AND location = ? AND start_datetime = ?'
      ).bind(event.subject || null, event.location || null, event.start_datetime || null);

      // Extract externaleventid from web_link if available
      let extractedEventId = null;
      if (event.web_link) {
        const eventIdMatch = event.web_link.match(/eventid%3d(\d+)/);
        if (eventIdMatch && eventIdMatch[1]) {
          extractedEventId = eventIdMatch[1];
        }
      }

      // Generate slug for the event
      const slug = createSlug(event.subject, event.location);

      // Helper function to convert arrays to comma-separated strings
      const arrayToString = (value: string | string[] | null | undefined): string | null => {
        if (value === null || value === undefined) return null;
        if (Array.isArray(value)) {
          return value.join(', ');
        }
        return String(value);
      };

      // Ensure all values are defined or null before binding
      const safeEvent = {
        subject: event.subject || null,
        web_link: event.web_link || null,
        location: event.location || null,
        start_datetime: event.start_datetime || null,
        end_datetime: event.end_datetime || null,
        formatteddatetime: event.formatteddatetime || null,
        description: event.description || null,
        event_template: event.event_template || null,
        event_type: arrayToString(event.event_type),
        parentevent: event.parentevent || null,
        primaryeventtype: event.primaryeventtype || null,
        cost: event.cost || null,
        eventimage: event.eventimage || null,
        age: event.age || null,
        bookings: event.bookings || null,
        bookingsrequired:
          typeof event.bookingsrequired === 'boolean' ? (event.bookingsrequired ? 1 : 0) : null,
        agerange: arrayToString(event.agerange),
        venue: event.venue || null,
        venueaddress: event.venueaddress || null,
        venuetype: event.venuetype || null,
        maximumparticipantcapacity: event.maximumparticipantcapacity || null,
        activitytype: arrayToString(event.activitytype),
        requirements: event.requirements || null,
        meetingpoint: event.meetingpoint || null,
        suburb: event.suburb || null,
        ward: event.ward || null,
        waterwayaccessfacilities: event.waterwayaccessfacilities || null,
        waterwayaccessinformation: event.waterwayaccessinformation || null,
        status: event.status || null,
        libraryeventtypes: arrayToString(event.libraryeventtypes),
        eventtype: event.eventtype || null,
        communityhall: event.communityhall || null,
        locationifvenueunavailable: event.locationifvenueunavailable || null,
        image: event.image || null,
        externaleventid: extractedEventId || event.externaleventid || null,
        slug: slug, // Add the generated slug
      };

      // Prepare the insert statement
      const insertStmt = env.DB.prepare(
        `
        INSERT INTO events (
          subject, web_link, location, start_datetime, end_datetime, formatteddatetime,
          description, event_template, event_type, parentevent, primaryeventtype,
          cost, eventimage, age, bookings, bookingsrequired, agerange,
          venue, venueaddress, venuetype, maximumparticipantcapacity, activitytype,
          requirements, meetingpoint, suburb, ward, waterwayaccessfacilities,
          waterwayaccessinformation, status, libraryeventtypes, eventtype,
          communityhall, locationifvenueunavailable, image, externaleventid, slug
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      ).bind(
        safeEvent.subject,
        safeEvent.web_link,
        safeEvent.location,
        safeEvent.start_datetime,
        safeEvent.end_datetime,
        safeEvent.formatteddatetime,
        safeEvent.description,
        safeEvent.event_template,
        safeEvent.event_type,
        safeEvent.parentevent,
        safeEvent.primaryeventtype,
        safeEvent.cost,
        safeEvent.eventimage,
        safeEvent.age,
        safeEvent.bookings,
        safeEvent.bookingsrequired,
        safeEvent.agerange,
        safeEvent.venue,
        safeEvent.venueaddress,
        safeEvent.venuetype,
        safeEvent.maximumparticipantcapacity,
        safeEvent.activitytype,
        safeEvent.requirements,
        safeEvent.meetingpoint,
        safeEvent.suburb,
        safeEvent.ward,
        safeEvent.waterwayaccessfacilities,
        safeEvent.waterwayaccessinformation,
        safeEvent.status,
        safeEvent.libraryeventtypes,
        safeEvent.eventtype,
        safeEvent.communityhall,
        safeEvent.locationifvenueunavailable,
        safeEvent.image,
        safeEvent.externaleventid,
        safeEvent.slug
      );

      return { checkStmt, insertStmt, event: safeEvent };
    });

    // Execute the batch
    for (const { checkStmt, insertStmt, event } of statements) {
      try {
        const result = await checkStmt.first<{ count: number }>();
        if (!result || result.count === 0) {
          await insertStmt.run();
          savedCount++;
          console.log(
            `Saved event: ${event.subject} | ${event.location} | ${event.start_datetime} | Slug: ${event.slug}`
          );
        } else {
          console.log(
            `Event already exists: ${event.subject} | ${event.location} | ${event.start_datetime}`
          );
        }
      } catch (error) {
        console.error(`Error saving event ${event.subject}:`, error);
      }
    }
  }

  return savedCount;
}
