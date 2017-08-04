import { thenable } from '../utils';

export default function navigate(url) {
	// TODO allow to skip navigation if url already matches.
	return thenable(() => {
		// NOTE never resolve.
		window.location = url;
	});
}
