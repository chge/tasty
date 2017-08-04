import { thenable } from '../utils';

export default function reload() {
	return thenable(() => {
		// NOTE never resolve.
		window.location.reload(true);
	});
}
