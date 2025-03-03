# Brisbane Event Sync Worker

This project is a Cloudflare Worker that synchronizes events from the Brisbane City Council's public API to a D1 database. It automatically fetches and stores event data on a schedule, making it available for other applications to use.

## Features

- **Automated Event Syncing**: Fetches events from Brisbane City Council's API on a daily schedule (2 AM UTC)
- **Incremental Updates**: Only fetches new events since the last sync
- **Pagination Handling**: Manages API pagination to retrieve all available events (handles the 100-record limit)
- **Duplicate Prevention**: Checks for existing events before inserting to avoid duplicates
- **Test Endpoints**: Provides endpoints to test database and API connections
- **Error Handling**: Robust error handling for API and database operations
- **Batch Processing**: Processes events in batches to avoid overwhelming the database

## Tech Stack

- **Cloudflare Workers**: Serverless execution environment
- **Cloudflare D1**: SQLite-compatible serverless database
- **TypeScript**: Type-safe JavaScript for better development experience
- **ESLint & Prettier**: Code quality and formatting tools

## Project Structure
# Database migration files
/Users/yoh/worker/viaBrisbaneEventSync/
├── migrations/
│   └── 0000_create_events_table.sql  # Initial schema creation
├── src/
│   └── server/
│       ├── index.ts             # Main worker implementation
│       ├── test.ts              # Test endpoints implementation
│       └── types.ts             # TypeScript interfaces
├── .eslintrc.js                 # ESLint configuration
├── .prettierrc                  # Prettier configuration
├── package.json                 # Project dependencies and scripts
├── tsconfig.json                # TypeScript configuration
└── wrangler.toml                # Cloudflare Worker configuration


## Setup Instructions

### Prerequisites

- Node.js (v16 or later)
- npm or yarn
- Cloudflare account with Workers and D1 access

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd viaBrisbaneEventSync
```

2. Install dependencies:
```bash
npm install
```

3. Set up the D1 database:
```bash
# Create a D1 database (if not already created)
npx wrangler d1 create viabrisbane

# Run the migration to create the events table
npx wrangler d1 execute viabrisbane --local --file=./migrations/0000_create_events_table.sql
npx wrangler d1 execute viabrisbane --file=./migrations/0000_create_events_table.sql
```

4. Update the wrangler.toml file with your D1 database ID (if needed).

## Development
Run the worker locally:
```bash
# Run the main worker
npm run dev

# Run the test worker
npm run dev:test
```

Format and lint your code:
```bash
# Format code
npm run format

# Lint code
npm run lint
```

## Testing
The project includes test endpoints to verify functionality:

- /test/db : Test database connection
- /test/api : Test API connection
- /test/all : Test both database and API connections
Access these endpoints when running the test worker:
```bash
npm run dev:test
```
Then visit: http://localhost:8787/test/all

### Deployment
Deploy the worker to Cloudflare:
```bash
# Deploy the main worker
npm run deploy

# Deploy the test worker
npm run deploy:test
```

## How It Works
1. The worker runs on a schedule (daily at 2 AM UTC) or can be triggered manually via HTTP request.
2. It queries the database to find the latest event's date (based on the most recent event_id).
3. It then fetches all events from the Brisbane City Council API that occur after this date.
4. For each batch of events:
   - It checks if the event already exists in the database (based on subject and start_datetime)
   - If not, it inserts the event with all its details
   - All values are sanitized to prevent null/undefined errors
5. The worker handles pagination by making multiple API requests if needed, using offset and total_count.

## API Details
The worker interacts with the Brisbane City Council Events API:

- Base URL: https://data.brisbane.qld.gov.au/api/explore/v2.1/catalog/datasets/brisbane-city-council-events/records
- The API has a limit of 100 results per request, so pagination is implemented.
- Query parameters:
  - where : Filters events by date (e.g., start_datetime >= '2023-01-01T00:00:00+00:00' )
  - order_by : Sorts results (e.g., by start_datetime )
  - limit : Maximum number of records to return (max 100)
  - offset : Number of records to skip for pagination

## Database Schema
The events table stores the following information:
```sql
CREATE TABLE events (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject VARCHAR(89) NULL,
  web_link VARCHAR(85) NULL,
  location VARCHAR(89) NULL,
  start_datetime VARCHAR(25) NULL,
  end_datetime VARCHAR(25) NULL,
  formatteddatetime VARCHAR(43) NULL,
  description VARCHAR(2510) NULL,
  event_template VARCHAR(25) NULL,
  event_type VARCHAR(90) NULL,
  parentevent VARCHAR(44) NULL,
  primaryeventtype VARCHAR(37) NULL,
  cost VARCHAR(109) NULL,
  eventimage VARCHAR(59) NULL,
  age VARCHAR(78) NULL,
  bookings VARCHAR(562) NULL,
  bookingsrequired BOOLEAN NULL,
  agerange VARCHAR(44) NULL,
  venue VARCHAR(55) NULL,
  venueaddress VARCHAR(118) NULL,
  venuetype VARCHAR(45) NULL,
  maximumparticipantcapacity VARCHAR(3) NULL,
  activitytype VARCHAR(39) NULL,
  requirements VARCHAR(165) NULL,
  meetingpoint VARCHAR(159) NULL,
  suburb VARCHAR(14) NULL,
  ward VARCHAR(17) NULL,
  waterwayaccessfacilities VARCHAR(42) NULL,
  waterwayaccessinformation VARCHAR(254) NULL,
  status VARCHAR(9) NULL,
  libraryeventtypes VARCHAR(55) NULL,
  eventtype VARCHAR(21) NULL,
  communityhall VARCHAR(32) NULL,
  locationifvenueunavailable VARCHAR(65) NULL,
  image VARCHAR(55) NULL,
  externaleventid VARCHAR(9) NULL
);
```
Each event is uniquely identified by its subject and start date/time.

## License
ISC