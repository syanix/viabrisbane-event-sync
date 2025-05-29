export interface EventRecord {
  // Using snake_case to match the database column names
  // but adding comments to show the camelCase equivalents
  subject: string | null; // subject
  web_link: string | null; // webLink
  location: string | null; // location
  start_datetime: string | null; // startDatetime
  end_datetime: string | null; // endDatetime
  formatteddatetime: string | null; // formattedDatetime
  description: string | null; // description
  event_template: string | null; // eventTemplate
  event_type: string | string[] | null; // eventType - can be array in API
  parentevent: string | null; // parentEvent
  primaryeventtype: string | null; // primaryEventType
  cost: string | null; // cost
  eventimage: string | null; // eventImage
  age: string | null; // age
  bookings: string | null; // bookings
  bookingsrequired: number | string | null; // bookingsRequired (can be boolean string or number)
  agerange: string | string[] | null; // ageRange - can be array in API
  venue: string | null; // venue
  venueaddress: string | null; // venueAddress
  venuetype: string | null; // venueType
  maximumparticipantcapacity: string | null; // maximumParticipantCapacity
  activitytype: string | string[] | null; // activityType - can be array in API
  requirements: string | null; // requirements
  meetingpoint: string | null; // meetingPoint
  suburb: string | null; // suburb
  ward: string | null; // ward
  waterwayaccessfacilities: string | null; // waterwayAccessFacilities
  waterwayaccessinformation: string | null; // waterwayAccessInformation
  status: string | null; // status
  libraryeventtypes: string | string[] | null; // libraryEventTypes - can be array in API
  eventtype: string | null; // eventTypeField
  communityhall: string | null; // communityHall
  locationifvenueunavailable: string | null; // locationifvenueunavailable
  image: string | null; // image
  externaleventid: string | null; // externaleventid
  slug?: string | null; // URL-friendly slug for the event
}

export interface ApiResponse {
  total_count: number;
  results: EventRecord[];
}
