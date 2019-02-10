export class ProgressTracker {
  constructor() {
    this.tasks = 0;
    this.completed = 0;
  }
  addTasks(tasks) {
    this.tasks += tasks;
  }
  addCompleted(completed) {
    this.completed += completed;
  }
  value() {
    return this.tasks && this.completed / this.tasks;
  }
}
