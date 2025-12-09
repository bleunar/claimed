import { ExclamationTriangle } from "react-bootstrap-icons";

const ErrorPage = ({ 
  title = "Page Not Found", 
  error_code = "404",
  description = "The content you are looking for does not exist or has been moved.", 
  redirectLink = "/" 
}) => {
  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
      <div className="text-center p-5 bg-white shadow-sm rounded-3 border" style={{ maxWidth: '500px' }}>
        <div className="mb-4">
          <ExclamationTriangle className="display-2" />
        </div>

        <div className="h5 text-dark">Error {error_code}</div>
        <div className="h2 fw-semibold text-dark">{title}</div>
        <p className="fw-semilight text-muted mb-4">
          {description}
        </p>

        <hr className="my-4 mx-auto w-25" />

        <a 
          href={redirectLink} 
          className="btn btn-dark btn-lg px-4 gap-3 text-uppercase fw-semibold"
          style={{ fontSize: '0.85rem', letterSpacing: '1px' }}
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  );
};

export default ErrorPage;