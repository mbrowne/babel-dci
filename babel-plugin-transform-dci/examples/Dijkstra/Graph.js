/* @flow */

//IN PROGRESS

export default function Graph(edges) {
	this.nodes = new Map();
	this.distances = new Map();
	this.previous = new Map();

	for (let edge of edges) {
		const from = edge[0],
			to = edge[1],
			dist = edge[2];

		let pairs = this.nodes.get(from);
		if (pairs === null) {
			pairs = new Map();
			pairs.set(to, dist);
			this.nodes.add(from, pairs);
		}
		else {
			pairs.set(to, dist);
		}

		this.distances.put(from, Infinity);
	}
	
	role nodes {}
	
	//TODO getters
	this.getNodes = function() {
		return this.nodes;
	};
}