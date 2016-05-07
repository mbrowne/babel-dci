/**
 * In-memory object storage (used as a mock database object)
 */
export default context ObjectStore {
	entities_: Map<string, Object>;

	constructor() {
		this._entities = new Map();
	}
	
	save(entity: Object) {
		//TODO: throw an error if two objects have the same ID
		
		if (!this._entities.has(entity))
			this._entities.set((entity.id: string), entity);
	}
	
	getById(id: string | number): Object {
		return this._entities.get((id: string));
	}
	
	remove(item: string | number | Object) {
		if (typeof item === 'object') {
			for (let entity of this._entities.values()) {
				if (item === entity) {
					this.removeById(item.id);
					return;
				}
			}
		}
		else this.removeById(item);
	}
	
	removeById(id: string | number) {
		this._entities.delete((id: string));
	}
}