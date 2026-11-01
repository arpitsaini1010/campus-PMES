import React from 'react';

const StatusBadge = ({ status }) => {
  switch (status) {
    case 'Draft':
      return (
        <span className="status-badge status-draft" id="badge-draft">
          <i className="bi bi-pencil-square"></i> Draft
        </span>
      );
    case 'Proposal Submitted':
      return (
        <span className="status-badge status-proposal-submitted" id="badge-proposal-submitted">
          <i className="bi bi-hourglass-split"></i> Proposal Submitted
        </span>
      );
    case 'Approved':
    case 'In Progress':
      return (
        <span className="status-badge status-in-progress" id="badge-in-progress">
          <i className="bi bi-gear-wide-connected"></i> In Progress
        </span>
      );
    case 'Rejected':
      return (
        <span className="status-badge status-rejected" id="badge-rejected">
          <i className="bi bi-exclamation-triangle-fill"></i> Rejected
        </span>
      );
    case 'Final Submitted':
      return (
        <span className="status-badge status-final-submitted" id="badge-final-submitted">
          <i className="bi bi-file-earmark-check-fill"></i> Final Submitted
        </span>
      );
    case 'Evaluated':
      return (
        <span className="status-badge status-evaluated" id="badge-evaluated">
          <i className="bi bi-patch-check-fill"></i> Evaluated
        </span>
      );
    default:
      return (
        <span className="status-badge status-draft">
          {status || 'Unknown'}
        </span>
      );
  }
};

export default StatusBadge;
