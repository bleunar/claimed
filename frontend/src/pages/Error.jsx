import { ExclamationTriangle } from "react-bootstrap-icons";

const ErrorPage = ({ 
  title = "Page Not Found", 
  error_code = "404",
  description = "The content you are looking for does not exist or has been moved.", 
  redirectLink = "/dashboard" 
}) => {
  return (
    <div className="d-flex align-items-center justify-content-center h-100">
      <div className="text-center p-5" style={{ maxWidth: '500px' }}>
        <div className="mb-4">
          <ExclamationTriangle className="display-2" />
        </div>

        <div className="h5 text-body">Error {error_code}</div>
        <div className="h2 fw-semibold text-body">{title}</div>
        <p className="fw-semilight text-muted mb-4">
          {description}
        </p>

        <a 
          href={redirectLink} 
          className="btn btn-primary btn-sm px-4"
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  );
};

export default ErrorPage;