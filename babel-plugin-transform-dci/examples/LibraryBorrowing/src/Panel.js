import Ractive from 'ractive';

export default function Panel() {
	return new Ractive({
		el: 'container',
		template: '#panelTemplate'
	});
}