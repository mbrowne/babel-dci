/**
  Creates a wrapper for a promise that can be resolved or rejected via public methods
  (similar to jQuery's `$.Deferred`)
  
  * promise - a Promise object
  * reject - a function that causes the `promise` property on this object to
    become rejected
  * resolve - a function that causes the `promise` property on this object to
    become fulfilled.
 
   Example:
   ```javascript
   var deferred = new Deferred();
   deferred.resolve("Success!");
   deferred.promise.then(function(value){
     // value here is "Success!"
   });
   ```
 */
export default function Deferred(label: ?string) {
	this.promise = new Promise((resolve, reject) => {
		this.resolve = resolve;
		this.reject = reject;
	}, label);
}