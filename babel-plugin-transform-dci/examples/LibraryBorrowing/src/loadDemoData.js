import app from './app';
import Book from './data-objects/Book';
import DVD from './data-objects/DVD';

export default function loadDemoData() {
	let items = [
		new Book(1, 'The Brothers Karamazov'),
		new Book(2, "A Midsummer Night's Dream"),
		new Book(3, 'The Prophet'),
		new Book(4, 'Leaves of Grass'),
		new DVD(5, 'Curb Your Enthusiasm - Season 6'),
		new DVD(6, 'Breaking Away'),
		new DVD(7, 'The Shawshank Redemption')
	];

	for (let item of items) {
		app.objectStore.save(item);
	}
}