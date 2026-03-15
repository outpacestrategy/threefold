import React, { useState } from 'react';
import { Modal } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import CalendarScreen from '../screens/CalendarScreen';
import StatsScreen from '../screens/StatsScreen';
import HomeScreen from '../screens/HomeScreen';
import InsightsScreen from '../screens/InsightsScreen';
import CoachScreen from '../screens/CoachScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const TAB_ICONS: Record<string, { focused: string; unfocused: string }> = {
  Calendar: { focused: 'calendar', unfocused: 'calendar-outline' },
  Stats: { focused: 'bar-chart', unfocused: 'bar-chart-outline' },
  Today: { focused: 'radio-button-on', unfocused: 'radio-button-off' },
  Insights: { focused: 'bulb', unfocused: 'bulb-outline' },
  Chat: { focused: 'chatbubble', unfocused: 'chatbubble-outline' },
};

interface Props {
  onSignOut: () => void;
}

export default function AppNavigator({ onSignOut }: Props) {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <>
      <Tab.Navigator
        initialRouteName="Today"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused }) => {
            const icons = TAB_ICONS[route.name];
            const iconName = focused ? icons.focused : icons.unfocused;
            return (
              <Ionicons
                name={iconName as any}
                size={22}
                color={focused ? '#1A1A1A' : '#A0A0A0'}
              />
            );
          },
          tabBarActiveTintColor: '#1A1A1A',
          tabBarInactiveTintColor: '#A0A0A0',
          tabBarStyle: {
            backgroundColor: '#FAFAF9',
            borderTopColor: '#F0EFEC',
            paddingTop: 8,
            paddingBottom: 28,
            height: 88,
          },
          tabBarLabelStyle: {
            fontSize: 10,
            fontWeight: '500' as const,
          },
        })}
      >
        <Tab.Screen name="Calendar">
          {() => <CalendarScreen onOpenProfile={() => setShowProfile(true)} />}
        </Tab.Screen>
        <Tab.Screen name="Stats" component={StatsScreen} />
        <Tab.Screen name="Today">
          {() => <HomeScreen onOpenProfile={() => setShowProfile(true)} />}
        </Tab.Screen>
        <Tab.Screen name="Insights" component={InsightsScreen} />
        <Tab.Screen name="Chat" component={CoachScreen} />
      </Tab.Navigator>

      <Modal
        visible={showProfile}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowProfile(false)}
      >
        <ProfileScreen
          onSignOut={() => { setShowProfile(false); onSignOut(); }}
          onClose={() => setShowProfile(false)}
        />
      </Modal>
    </>
  );
}
