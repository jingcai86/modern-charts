import {
  DEFAULT_OPEN_GUIDE_GROUP_COUNT,
  GUIDE_GROUPS,
  wireGuideGroupPersistence
} from './types';

export function createGuideNavigationGroups(): DocumentFragment {
  const groups = document.createDocumentFragment();

  for (const [index, group] of GUIDE_GROUPS.entries()) {
    const section = document.createElement('li');
    const disclosure = document.createElement('details');
    disclosure.className = 'nav-dropdown-group';
    const label = document.createElement('summary');
    label.id = `nav-guide-group-${group.id}`;
    label.className = 'nav-dropdown-group-label';
    label.textContent = group.title;
    wireGuideGroupPersistence(
      disclosure,
      label,
      group.id,
      index < DEFAULT_OPEN_GUIDE_GROUP_COUNT
    );

    const links = document.createElement('ul');
    links.className = 'nav-dropdown-group-links';
    links.setAttribute('aria-labelledby', label.id);

    for (const guide of group.guides) {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#/guide/${guide.id}`;
      link.className = 'nav-dropdown-link';
      link.dataset.navRoute = `guide:${guide.id}`;
      link.dataset.navLabel = `${guide.icon} ${guide.shortLabel}`;
      link.textContent = link.dataset.navLabel;
      item.append(link);
      links.append(item);
    }

    disclosure.append(label, links);
    section.append(disclosure);
    groups.append(section);
  }

  return groups;
}
