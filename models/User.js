class User {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.email = data.email;
    this.password = data.password;
    this.created_at = data.created_at;
    this.updated_at = data.updated_at;
  }

  // Remove password from user object
  toJSON() {
    const obj = { ...this };
    delete obj.password;
    return obj;
  }
}

module.exports = User;

