export class Observer {
  constructor({ maxEvents = 1200, onEvent } = {}) {
    this.maxEvents = maxEvents;
    this.onEvent = onEvent;
    this.events = [];
  }

  record(type, fields = {}) {
    const event = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, type, at: new Date().toISOString(), ...fields };
    this.events.push(event);
    if (this.events.length > this.maxEvents) this.events.splice(0, this.events.length - this.maxEvents);
    this.onEvent?.(event, this);
    return event;
  }

  update(id, fields) {
    const event = this.events.find((item) => item.id === id);
    if (event) Object.assign(event, fields);
    return event;
  }

  export(extra = {}) {
    return { exportedAt: new Date().toISOString(), ...extra, events: this.events.slice() };
  }

  reset() { this.events = []; }
}

