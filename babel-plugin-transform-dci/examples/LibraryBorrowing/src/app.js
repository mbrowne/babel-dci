import User from './data-objects/User';
import ObjectStore from './ObjectStore';

var app = {};
export default app;

app.session = {
	user: new User(12345, 'Test', 'User')
};
	
app.objectStore = new ObjectStore();