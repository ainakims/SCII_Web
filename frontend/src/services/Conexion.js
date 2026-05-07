class Conexion {
  constructor() {
    this.url = "/api-asmx/Conexion.asmx";
  }

  async callWebService(methodName, params) {
    const soapAction = `http://tempuri.org/${methodName}`;

    const wsAuthUser = import.meta.env.VITE_WS_AUTH_USER;
    const wsAuthPass = import.meta.env.VITE_WS_AUTH_PASS;

    const soapEnvelope = `
      <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
        <soap:Header>
          <ValidaUsuario xmlns="http://tempuri.org/">
            <Usuario>${wsAuthUser}</Usuario>
            <Contrasena>${wsAuthPass}</Contrasena>
          </ValidaUsuario>
        </soap:Header>  
        <soap:Body>
          <${methodName} xmlns="http://tempuri.org/">
            ${Object.keys(params)
              .map((key) => `<${key}>${params[key]}</${key}>`)
              .join("")}
          </${methodName}>
        </soap:Body>
      </soap:Envelope>
    `;

    try {
      const response = await fetch(this.url, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: soapAction,
        },
        body: soapEnvelope,
      });

      const xmlText = await response.text();
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, "text/xml");
      // const resultNode = xmlDoc.getElementsByTagName(`${methodName}Result`)[0];
      // return resultNode ? resultNode.textContent : null;

      const validoNode = xmlDoc.getElementsByTagName("Valido")[0];
      const usuarioNode = xmlDoc.getElementsByTagName("Usuario")[0];
      const passwordNode = xmlDoc.getElementsByTagName("Password")[0];

      return {
        valido: validoNode ? validoNode.textContent === "true" : false,
        usuario: usuarioNode ? usuarioNode.textContent : "",
        mensaje: passwordNode ? passwordNode.textContent : "",
      };
    } catch (error) {
      console.error(`Error en ${methodName}:`, error);
      throw error;
    }
  }

  async GetUsuario(nombre, password) {
    return await this.callWebService("GetUsuario", { nombre, password });
  }

  async ValidaUsuarioAD(Usuario, Contrasena) {
    return await this.callWebService("ValidaUsuarioAD", { Usuario, Contrasena });
  }

  async ObtenerDatosInfor(consulta) {
    return await this.callWebService("ObtenerDatosInfor", { consulta });
  }
}

export const ConexionSql = new Conexion();