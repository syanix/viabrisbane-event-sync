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
  event_type: string | null; // eventType
  parentevent: string | null; // parentEvent
  primaryeventtype: string | null; // primaryEventType
  cost: string | null; // cost
  eventimage: string | null; // eventImage
  age: string | null; // age
  bookings: string | null; // bookings
  bookingsrequired: number | null; // bookingsRequired (integer in schema)
  agerange: string | null; // ageRange
  venue: string | null; // venue
  venueaddress: string | null; // venueAddress
  venuetype: string | null; // venueType
  maximumparticipantcapacity: string | null; // maximumParticipantCapacity
  activitytype: string | null; // activityType
  requirements: string | null; // requirements
  meetingpoint: string | null; // meetingPoint
  suburb: string | null; // suburb
  ward: string | null; // ward
  waterwayaccessfacilities: string | null; // waterwayAccessFacilities
  waterwayaccessinformation: string | null; // waterwayAccessInformation
  status: string | null; // status
  libraryeventtypes: string | null; // libraryEventTypes
  eventtype: string | null; // eventTypeField
  communityhall: string | null; // communityHall
  locationifvenueunavailable: string | null; // locationifvenueunavailable
  image: string | null; // image
  externaleventid: string | null; // externaleventid
}

export interface ApiResponse {
  total_count: number;
  results: EventRecord[];
}
