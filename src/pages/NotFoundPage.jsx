import { Link } from "react-router";

function NotFoundPage() {
  return (
    <section className="panel">
      <div className="state">
        <p className="state-title">Page not found</p>
        <p>This page does not exist.</p>
        <Link className="btn btn-primary" to="/">
          Go to my library
        </Link>
      </div>
    </section>
  );
}

export default NotFoundPage;
