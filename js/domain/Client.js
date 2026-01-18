export class Client {
    constructor(data = {}) {
        this.id = data.id || null;
        this.civilite = data.civilite || '';
        this.nom = data.nom || '';
        this.prenom = data.prenom || '';
        this.adresse = data.adresse || '';
        this.role = data.role || 'MANDANT'; // MANDANT ou DEFUNT
        this.email = data.email || '';
        this.telephone = data.telephone || '';
    }

    get nomComplet() {
        return `${this.nom} ${this.prenom}`.trim();
    }
}