import { app } from '@wix/astro/builders'
import ticketFairyTickets from './extensions/site/widgets/ticket-fairy-tickets/ticket-fairy-tickets.extension.ts'

export default app().use(ticketFairyTickets)
