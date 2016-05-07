import app from './app';
import Book from './data-objects/Book';

export default function loadDemoData() {
	let books = [
		new Book(1, 'The Brothers Karamazov'),
		new Book(2, "A Midsummer Night's Dream"),
		new Book(3, 'The Prophet'),
		new Book(4, 'Leaves of Grass')
	];

	for (let book of books) {
		app.objectStore.save(book);
	}
}