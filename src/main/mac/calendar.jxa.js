// JavaScript for Automation (run with `osascript -l JavaScript`): lists the
// next few hours of events from the Mac Calendar app (which syncs your Google
// Calendar) using EventKit, and prints them as JSON:
//   {"events":[{"title":"Standup","start":1760000000000,"end":1760000900000}]}
// or {"error":"denied"|"restricted"|"…"} if it can't read them.
// The first time, macOS asks whether Togepi may access your calendars.

ObjC.import('EventKit');
ObjC.import('Foundation');

function authStatus() {
  // 0 not determined, 1 restricted, 2 denied, 3 full access, 4 write-only
  return Number($.EKEventStore.authorizationStatusForEntityType(0));
}

function requestAccess(store) {
  let done = false;
  const handler = function () {
    done = true;
  };
  // macOS 14+ uses requestFullAccessToEvents; older versions requestAccessToEntityType.
  if (store.respondsToSelector('requestFullAccessToEventsWithCompletion:')) {
    store.requestFullAccessToEventsWithCompletion(handler);
  } else {
    store.requestAccessToEntityTypeCompletion(0, handler);
  }
  // Wait (up to 2 minutes) for you to answer the permission prompt.
  const giveUp = Date.now() + 120000;
  while (!done && Date.now() < giveUp) {
    $.NSRunLoop.currentRunLoop.runUntilDate($.NSDate.dateWithTimeIntervalSinceNow(0.2));
  }
}

function run(argv) {
  const hours = Number(argv[0]) || 12;
  let store = $.EKEventStore.alloc.init;
  if (authStatus() === 0) {
    requestAccess(store);
    store = $.EKEventStore.alloc.init; // a fresh store sees the new permission
  }
  const status = authStatus();
  if (status !== 3) {
    return JSON.stringify({ error: ['not determined', 'restricted', 'denied', '', 'write-only'][status] || `status ${status}` });
  }
  const now = $.NSDate.date;
  const until = $.NSDate.dateWithTimeIntervalSinceNow(hours * 3600);
  // A little in the past too, so an event you're in right now is included.
  const from = $.NSDate.dateWithTimeIntervalSinceNow(-6 * 3600);
  const predicate = store.predicateForEventsWithStartDateEndDateCalendars(from, until, null);
  const found = store.eventsMatchingPredicate(predicate);
  const events = [];
  const nowMs = Number(now.timeIntervalSince1970) * 1000;
  for (let i = 0; i < Number(found.count); i++) {
    const e = found.objectAtIndex(i);
    if (e.allDay) continue; // all-day events aren't meetings
    const start = Number(e.startDate.timeIntervalSince1970) * 1000;
    const end = Number(e.endDate.timeIntervalSince1970) * 1000;
    if (end <= nowMs) continue;
    // Skip events you've declined (participantStatus 3 = declined).
    let declined = false;
    try {
      const attendees = e.attendees;
      if (attendees && !attendees.isNil()) {
        for (let j = 0; j < Number(attendees.count); j++) {
          const a = attendees.objectAtIndex(j);
          if (a.isCurrentUser && Number(a.participantStatus) === 3) declined = true;
        }
      }
    } catch (err) {
      // attendee info isn't essential
    }
    if (declined) continue;
    events.push({ title: ObjC.unwrap(e.title) || 'Event', start, end });
  }
  return JSON.stringify({ events });
}
