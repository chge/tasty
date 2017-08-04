// TODO
export default function thing(type, value) {
	type = type || 'unknown';

	return typeof type === 'object' ?
		type :
		typeof value === 'undefined' ?
			{
				type: type
			} :
			{
				type: type,
				value: value
			};
}
