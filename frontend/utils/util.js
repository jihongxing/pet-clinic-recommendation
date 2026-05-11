function formatDistance(distance) {
  if (typeof distance !== 'number') {
    return '';
  }

  if (distance < 1000) {
    return `${distance}m`;
  }

  return `${(distance / 1000).toFixed(1)}km`;
}

module.exports = {
  formatDistance,
};
