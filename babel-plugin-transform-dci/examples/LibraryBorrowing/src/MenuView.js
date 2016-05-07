import Ractive from 'ractive';

export default Ractive.extend({
	template: '#menuTemplate',
	data: {
		firstItemScanned: false
	}
});