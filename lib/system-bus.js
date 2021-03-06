const EventEmitter = require('events');
const { Logger } = require('./utils/logger');

/**
 * Bus for broadcasting system-level messages across all actors.
 */
class SystemBus extends EventEmitter {
  /**
   * @param {Object} [options={}] Startup options.
   */
  constructor(options = {}) {
    super();
    this.setMaxListeners(50);
    this.log = options.log || new Logger();
    this.recipients = new Set();
  }

  /**
   * Decorates EventEmitter's emit method with additional logic. Do not use this method from any client code
   * other than actors.
   * 
   * @param {String} event Event name.
   * @param {String[]} [senders=[]] Chain of actors (ID's) who sent that message.
   * @param {any} args Emission arguments.
   */
  emit(event, senders = [], ...args) {
    this._broadcastToForkedRecipients(event, senders, ...args);
    super.emit(event, ...args);
  }

  /**
   * Adds forked recipient actor.
   * 
   * @param {ForkedActor} recipient Actor receiving messages.
   */
  addForkedRecipient(recipient) {
    if (!['forked', 'remote'].includes(recipient.getMode())) {
      this.log.error(`Trying to add invalid recipient to the system's bus: ${recipient}`);

      return;
    }

    this.recipients.add(recipient);
  }

  /**
   * Removes forked recipient actor.
   * 
   * @param {ForkedActor} recipient Actor receiving messages.
   */
  removeForkedRecipient(recipient) {
    this.recipients.delete(recipient);
  }

  /**
   * Broadcasts event data to forked and remote systems.
   * 
   * @param {String} event Event name.
   * @param {String[]} [senders=[]] Chain of actors (ID's) who sent that message.
   * @param {*} args Emission arguments.
   */
  _broadcastToForkedRecipients(event, senders = [], ...args) {
    this.recipients.forEach(recipient => {
      if (!senders.includes(recipient.getId())) {
        recipient.transmitBusMessage(event, senders, ...args);
      }
    });
  }
}

module.exports = SystemBus;