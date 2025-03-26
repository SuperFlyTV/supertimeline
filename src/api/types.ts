/** Point in time, (timestamp) */
export type Time = number
/** Duration */
export type Duration = number

/** Id of a timeline-object */
export type ObjectId = string

export type InstanceId = `@${string}`

// References:

export type ObjectReference = `#${string}`
export type ClassReference = `.${string}`
export type LayerReference = `$${string}`
export type InstanceReference = `@${InstanceId}`
export type ParentReference = '##parent'
export type Reference = ObjectReference | ClassReference | LayerReference | InstanceReference | ParentReference
