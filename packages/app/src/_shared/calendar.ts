import { syncWritable, type SyncWritable } from './stores'

export type CalendarMode = 'ethiopian' | 'gregorian'

/**
 * Rough number of years to add to an Ethiopian calendar year to approximate the
 * corresponding Gregorian year (the actual cutover falls in September, but for
 * axis display purposes a flat offset is close enough).
 */
export const ETHIOPIAN_TO_GREGORIAN_OFFSET = 8

/** The calendar used to display x-axis (time) labels on the graphs. */
export const calendarMode: SyncWritable<CalendarMode> = syncWritable('ethiopian')
